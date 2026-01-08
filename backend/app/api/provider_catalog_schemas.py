from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ProviderFieldOption(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    icon: Optional[str] = None


class ProviderField(BaseModel):
    id: str
    label: str
    field_type: str = Field(..., alias="type")
    required: bool = False
    placeholder: Optional[str] = None
    default: Optional[Any] = None
    description: Optional[str] = None
    scope: str = "config"
    options: List[ProviderFieldOption] = Field(default_factory=list)
    options_source: Optional[str] = Field(default=None, alias="optionsSource")

    class Config:
        populate_by_name = True


class ProviderDefaults(BaseModel):
    base_url: Optional[str] = Field(default=None, alias="baseUrl")
    model: Optional[str] = None
    voice: Optional[str] = None

    class Config:
        populate_by_name = True


class ProviderDesc(BaseModel):
    id: str
    label: str
    category: str
    icon: Optional[str] = None
    description: Optional[str] = None
    engine_id: Optional[str] = Field(default=None, alias="engineId")
    defaults: Optional[ProviderDefaults] = None
    fields: List[ProviderField] = Field(default_factory=list)

    class Config:
        populate_by_name = True


class ProviderCatalogResponse(BaseModel):
    providers: List[ProviderDesc] = Field(default_factory=list)


class PluginDesc(BaseModel):
    id: str
    name: str
    version: Optional[str] = None
    description: Optional[str] = None
    providers: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PluginCatalogResponse(BaseModel):
    plugins: List[PluginDesc] = Field(default_factory=list)
