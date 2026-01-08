import base64
import io
import json
import wave
from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect

from app.api.engine_schemas import (
    EngineDefaultResponse,
    EngineDesc,
    EngineListResponse,
    EngineParam,
    EngineParamsResponse,
    EngineRunRequest,
    HealthResponse,
)
from app.services.engines import registry, runtime_store
from app.services.engines.health import check_engine_health
from app.core.http_utils import normalize_path, resolve_api_key, sanitize_config

router = APIRouter(prefix="/asr", tags=["asr"])
ASR_BLOCKED_CONFIG_KEYS = frozenset(
    {
        "api_key",
        "apiKey",
        "base_url",
        "baseUrl",
        "engine",
        "filename",
        "file_name",
        "file",
        "content_type",
        "mime_type",
    }
)


@router.get("/engines", response_model=EngineListResponse)
async def list_asr_engines() -> EngineListResponse:
    engines = [EngineDesc.from_spec(spec) for spec in registry.list("asr")]
    return EngineListResponse(engines=engines)


@router.get("/engines/default", response_model=EngineDefaultResponse)
async def get_default_asr_engine() -> EngineDefaultResponse:
    spec = registry.get_default("asr")
    engine = EngineDesc.from_spec(spec) if spec else None
    return EngineDefaultResponse(engine=engine)


@router.get("/engines/{engine}/params", response_model=EngineParamsResponse)
async def get_asr_engine_params(engine: str) -> EngineParamsResponse:
    params = [EngineParam.from_spec(p) for p in registry.get_params("asr", engine)]
    return EngineParamsResponse(params=params)


@router.get("/engines/{engine}/health", response_model=HealthResponse)
async def get_asr_engine_health(engine: str) -> HealthResponse:
    config = runtime_store.get("asr", engine)
    if not config:
        raise HTTPException(status_code=404, detail="Engine not found")
    return HealthResponse(**await check_engine_health(config))


@router.post("/engines")
async def run_asr_engine(request: EngineRunRequest) -> dict:
    engine_id = _resolve_engine_id(request.engine)
    config = _get_engine_config(engine_id)
    audio_bytes = _extract_audio_bytes(request.data)
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Missing audio data")
    overrides = request.config if isinstance(request.config, dict) else {}
    filename, content_type = _resolve_file_meta(overrides)
    engine_type = (config.engine_type or "openai_compat").lower()
    if engine_type in {"dify_asr", "dify"}:
        return await _forward_dify_transcription(config, audio_bytes, overrides, filename, content_type)
    if engine_type in {"coze_asr", "coze"}:
        return await _forward_coze_transcription(config, audio_bytes, overrides, filename, content_type)
    response = await _forward_transcription(config, audio_bytes, overrides, filename, content_type)
    return response


@router.post("/engines/file")
async def run_asr_engine_file(
    file: UploadFile = File(...),
    engine: str = "default",
) -> dict:
    engine_id = _resolve_engine_id(engine)
    config = _get_engine_config(engine_id)
    audio_bytes = await file.read()
    filename = file.filename or "audio.wav"
    content_type = file.content_type or "application/octet-stream"
    engine_type = (config.engine_type or "openai_compat").lower()
    if engine_type in {"dify_asr", "dify"}:
        return await _forward_dify_transcription(config, audio_bytes, {}, filename, content_type)
    if engine_type in {"coze_asr", "coze"}:
        return await _forward_coze_transcription(config, audio_bytes, {}, filename, content_type)
    response = await _forward_transcription(config, audio_bytes, {}, filename, content_type)
    return response


@router.websocket("/engines/stream")
async def run_asr_engine_stream(websocket: WebSocket) -> None:
    await websocket.accept()

    engine_id = "default"
    engine_config = None
    overrides: Dict[str, Any] = {}
    sample_rate = 16000
    channels = 1
    buffer = bytearray()

    try:
        while True:
            message = await websocket.receive()

            if message.get("text") is not None:
                try:
                    payload = json.loads(message["text"])
                except json.JSONDecodeError:
                    await websocket.send_json({"type": "error", "error": "Invalid JSON payload."})
                    continue

                message_type = payload.get("type")
                if message_type == "start":
                    engine_id = payload.get("engine", "default")
                    engine_id = _resolve_engine_id(engine_id)
                    engine_config = _get_engine_config(engine_id)
                    overrides = payload.get("config") if isinstance(payload.get("config"), dict) else {}
                    sample_rate = int(payload.get("sample_rate") or payload.get("sampleRate") or 16000)
                    channels = int(payload.get("channels") or 1)
                    buffer = bytearray()
                    await websocket.send_json({"type": "ready"})
                elif message_type == "stop":
                    if engine_config is None:
                        await websocket.send_json({"type": "error", "error": "Engine not initialized."})
                        continue
                    if not buffer:
                        await websocket.send_json({"type": "error", "error": "Missing audio data."})
                        continue

                    wav_bytes = _encode_wav_pcm16(bytes(buffer), sample_rate, channels)
                    filename = overrides.get("filename") or "audio.wav"
                    content_type = overrides.get("content_type") or "audio/wav"

                    engine_type = (engine_config.engine_type or "openai_compat").lower()
                    if engine_type in {"dify_asr", "dify"}:
                        response = await _forward_dify_transcription(
                            engine_config, wav_bytes, overrides, filename, content_type
                        )
                    elif engine_type in {"coze_asr", "coze"}:
                        response = await _forward_coze_transcription(
                            engine_config, wav_bytes, overrides, filename, content_type
                        )
                    else:
                        response = await _forward_transcription(
                            engine_config, wav_bytes, overrides, filename, content_type
                        )

                    await websocket.send_json({"type": "result", "data": response})
                    buffer = bytearray()
                elif message_type == "reset":
                    buffer = bytearray()
                else:
                    await websocket.send_json({"type": "error", "error": "Unknown message type."})

            elif message.get("bytes") is not None:
                buffer.extend(message["bytes"])

    except WebSocketDisconnect:
        return
    except Exception as exc:
        await websocket.send_json({"type": "error", "error": str(exc)})
        await websocket.close(code=1011)


def _resolve_engine_id(engine_id: str) -> str:
    if engine_id == "default":
        default_spec = registry.get_default("asr")
        return default_spec.id if default_spec else ""
    return engine_id


def _get_engine_config(engine_id: str):
    if not engine_id:
        raise HTTPException(status_code=400, detail="Missing engine id")
    config = runtime_store.get("asr", engine_id)
    if not config or not config.base_url:
        raise HTTPException(status_code=404, detail="ASR engine not configured")
    engine_type = (config.engine_type or "openai_compat").lower()
    if engine_type not in {"dify_asr", "coze_asr", "dify", "coze"} and not config.model:
        raise HTTPException(status_code=400, detail="ASR engine missing model")
    return config


def _extract_audio_bytes(data: Any) -> bytes:
    if data is None:
        return b""
    if isinstance(data, str):
        return _decode_base64(data)
    if isinstance(data, dict):
        base64_payload = data.get("audio_base64") or data.get("base64")
        if isinstance(base64_payload, str):
            return _decode_base64(base64_payload)
    return b""


def _decode_base64(payload: str) -> bytes:
    try:
        return base64.b64decode(payload, validate=True)
    except Exception:
        return b""


def _resolve_file_meta(overrides: Optional[Dict[str, Any]]) -> tuple[str, str]:
    if not overrides:
        return "audio.wav", "application/octet-stream"
    filename = (
        overrides.get("filename")
        or overrides.get("file_name")
        or overrides.get("file")
        or "audio.wav"
    )
    content_type = overrides.get("content_type") or overrides.get("mime_type") or "application/octet-stream"
    return str(filename), str(content_type)


def _encode_wav_pcm16(pcm_bytes: bytes, sample_rate: int, channels: int) -> bytes:
    with io.BytesIO() as buffer:
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(max(1, channels))
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_bytes)
        return buffer.getvalue()


async def _forward_transcription(
    config,
    audio_bytes: bytes,
    overrides: Optional[Dict[str, Any]],
    filename: str,
    content_type: str,
) -> dict:
    headers = {}
    headers.update(config.headers)
    api_key = resolve_api_key(config.api_key_env)
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    data: Dict[str, Any] = {"model": config.model}
    data.update(config.default_params)
    if isinstance(overrides, dict):
        data.update(sanitize_config(overrides, blocked=ASR_BLOCKED_CONFIG_KEYS))

    transcription_path = config.paths.get("transcription") if config.paths else None
    path = normalize_path(transcription_path or "/audio/transcriptions")
    url = config.base_url.rstrip("/") + path

    files = {"file": (filename, audio_bytes, content_type)}

    async with httpx.AsyncClient(timeout=config.timeout) as client:
        response = await client.post(url, headers=headers, data=data, files=files)
        response.raise_for_status()
        return response.json()


def _merge_params(config, overrides: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(config.default_params or {})
    merged.update(sanitize_config(overrides, blocked=ASR_BLOCKED_CONFIG_KEYS))
    return merged


async def _forward_dify_transcription(
    config,
    audio_bytes: bytes,
    overrides: Dict[str, Any],
    filename: str,
    content_type: str,
) -> dict:
    params = _merge_params(config, overrides)
    api_server = params.get("api_server") or config.base_url
    api_key = params.get("api_key") or resolve_api_key(config.api_key_env)
    username = params.get("username") or params.get("user")

    if not api_server or not api_key:
        raise HTTPException(status_code=400, detail="Dify ASR missing API server or key")

    headers = {"Authorization": f"Bearer {api_key}"}
    headers.update(config.headers)
    data: Dict[str, Any] = {}
    if username:
        data["user"] = username

    transcription_path = config.paths.get("transcription") if config.paths else None
    path = normalize_path(transcription_path or "/audio-to-text")
    url = api_server.rstrip("/") + path

    files = {"file": (filename, audio_bytes, content_type)}
    async with httpx.AsyncClient(timeout=config.timeout) as client:
        response = await client.post(url, headers=headers, data=data, files=files)
        response.raise_for_status()
        payload = response.json()
    text = _extract_text(payload)
    return {"text": text} if text else payload


async def _forward_coze_transcription(
    config,
    audio_bytes: bytes,
    overrides: Dict[str, Any],
    filename: str,
    content_type: str,
) -> dict:
    params = _merge_params(config, overrides)
    api_base = params.get("api_base") or config.base_url
    token = params.get("token") or resolve_api_key(config.api_key_env)

    if not api_base or not token:
        raise HTTPException(status_code=400, detail="Coze ASR missing API base or token")

    headers = {"Authorization": f"Bearer {token}"}
    headers.update(config.headers)

    transcription_path = config.paths.get("transcription") if config.paths else None
    path = normalize_path(transcription_path or "/v1/audio/transcriptions")
    url = api_base.rstrip("/") + path

    files = {"file": (filename, audio_bytes, content_type)}
    async with httpx.AsyncClient(timeout=config.timeout) as client:
        response = await client.post(url, headers=headers, files=files)
        response.raise_for_status()
        payload = response.json()
    text = _extract_text(payload)
    return {"text": text} if text else payload


def _extract_text(payload: Dict[str, Any]) -> str:
    if isinstance(payload.get("text"), str):
        return payload["text"]
    data = payload.get("data")
    if isinstance(data, dict) and isinstance(data.get("text"), str):
        return data["text"]
    return ""
