from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.services.engines.types import EngineParamSpec, EngineSpec


class EngineDesc(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @classmethod
    def from_spec(cls, spec: EngineSpec) -> "EngineDesc":
        return cls(
            id=spec.id,
            label=spec.label,
            description=spec.description,
            metadata=spec.metadata or {},
        )


class EngineParam(BaseModel):
    name: str
    param_type: str = Field(..., alias="type")
    required: bool = False
    default: Optional[Any] = None
    options: List[Any] = Field(default_factory=list)
    description: Optional[str] = None

    class Config:
        populate_by_name = True

    @classmethod
    def from_spec(cls, spec: EngineParamSpec) -> "EngineParam":
        return cls(
            name=spec.name,
            type=spec.param_type,
            required=spec.required,
            default=spec.default,
            options=spec.options,
            description=spec.description,
        )


class EngineListResponse(BaseModel):
    engines: List[EngineDesc] = Field(default_factory=list)


class EngineDefaultResponse(BaseModel):
    engine: Optional[EngineDesc] = None


class EngineParamsResponse(BaseModel):
    params: List[EngineParam] = Field(default_factory=list)


class HealthResponse(BaseModel):
    ok: bool
    status_code: Optional[int] = None
    message: Optional[str] = None
    latency_ms: Optional[float] = None


class VoiceDesc(BaseModel):
    id: str
    label: str
    language: Optional[str] = None
    gender: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class VoiceListResponse(BaseModel):
    voices: List[VoiceDesc] = Field(default_factory=list)


class EngineRunRequest(BaseModel):
    engine: str
    data: Optional[Any] = None
    config: Dict[str, Any] = Field(default_factory=dict)


class ConversationRequest(BaseModel):
    data: Optional[Dict[str, Any]] = None


class ConversationResponse(BaseModel):
    conversation_id: str = Field(..., alias="conversationId")

    class Config:
        populate_by_name = True
