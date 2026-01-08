import time
from typing import Dict, Optional

import httpx

from app.services.engines.runtime_store import EngineRuntimeConfig
from app.core.http_utils import normalize_path, resolve_api_key


async def check_engine_health(
    config: EngineRuntimeConfig,
    *,
    fallback_path: str = "/models",
    base_url_override: Optional[str] = None,
    api_key_override: Optional[str] = None,
) -> Dict[str, object]:
    start = time.monotonic()
    headers = {"Content-Type": "application/json"}
    headers.update(config.headers)
    api_key = api_key_override or resolve_api_key(config.api_key_env)
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    health_path = config.paths.get("health") if config.paths else None
    path = normalize_path(health_path or fallback_path)
    base_url = base_url_override or config.base_url
    url = base_url.rstrip("/") + path

    try:
        async with httpx.AsyncClient(timeout=config.timeout) as client:
            response = await client.get(url, headers=headers)
        latency_ms = (time.monotonic() - start) * 1000
        if response.status_code >= 400:
            return {
                "ok": False,
                "status_code": response.status_code,
                "message": response.text,
                "latency_ms": latency_ms,
            }
        return {
            "ok": True,
            "status_code": response.status_code,
            "latency_ms": latency_ms,
        }
    except httpx.HTTPError as exc:
        latency_ms = (time.monotonic() - start) * 1000
        return {
            "ok": False,
            "status_code": None,
            "message": str(exc),
            "latency_ms": latency_ms,
        }
