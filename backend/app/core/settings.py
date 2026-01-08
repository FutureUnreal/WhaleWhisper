import os
from functools import lru_cache
from pathlib import Path
from typing import Iterable

from pydantic import Field
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
    TomlConfigSettingsSource,
)


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field(default="WhaleWhisper Backend")
    debug: bool = Field(default=False, validation_alias="DEBUG")
    cors_allow_origins: list[str] = Field(
        default_factory=lambda: ["*"],
        validation_alias="CORS_ALLOW_ORIGINS",
    )
    engine_config_path: str = Field(
        default="config/engines.yaml",
        validation_alias="ENGINE_CONFIG_PATH",
    )
    provider_catalog_path: str = Field(
        default="config/providers.yaml",
        validation_alias="PROVIDER_CATALOG_PATH",
    )
    plugin_catalog_path: str = Field(
        default="config/plugins.yaml",
        validation_alias="PLUGIN_CATALOG_PATH",
    )
    ws_auth_token: str | None = Field(default=None, validation_alias="WS_AUTH_TOKEN")
    ssrf_proxy_url: str | None = Field(default=None, validation_alias="SSRF_PROXY_URL")
    ssrf_block_private: bool = Field(default=True, validation_alias="SSRF_BLOCK_PRIVATE")
    log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")
    llm_provider: str = Field(default="openai", validation_alias="LLM_PROVIDER")
    llm_timeout: float = Field(default=30.0, validation_alias="LLM_TIMEOUT")
    llm_temperature: float = Field(default=0.7, validation_alias="LLM_TEMPERATURE")
    llm_system_prompt: str | None = Field(default=None, validation_alias="LLM_SYSTEM_PROMPT")
    openai_api_key: str = Field(default="", validation_alias="OPENAI_API_KEY")
    openai_base_url: str = Field(
        default="https://api.openai.com/v1",
        validation_alias="OPENAI_BASE_URL",
    )
    openai_model: str = Field(default="gpt-4o-mini", validation_alias="OPENAI_MODEL")
    dify_base_url: str = Field(
        default="https://api.dify.ai/v1",
        validation_alias="DIFY_BASE_URL",
    )
    dify_api_key: str = Field(default="", validation_alias="DIFY_API_KEY")
    dify_user: str = Field(default="whale", validation_alias="DIFY_USER")
    fastgpt_base_url: str = Field(
        default="https://cloud.fastgpt.cn/api",
        validation_alias="FASTGPT_BASE_URL",
    )
    fastgpt_api_key: str = Field(default="", validation_alias="FASTGPT_API_KEY")
    fastgpt_uid: str = Field(default="whale", validation_alias="FASTGPT_UID")
    coze_api_base: str = Field(
        default="https://api.coze.cn",
        validation_alias="COZE_API_BASE",
    )
    coze_token: str = Field(default="", validation_alias="COZE_TOKEN")
    coze_bot_id: str = Field(default="", validation_alias="COZE_BOT_ID")
    coze_user: str = Field(default="whale", validation_alias="COZE_USER")
    memory_enabled: bool = Field(default=True, validation_alias="MEMORY_ENABLED")
    memory_db_path: str = Field(default="data/memory.db", validation_alias="MEMORY_DB_PATH")
    memory_session_window: int = Field(default=12, validation_alias="MEMORY_SESSION_WINDOW")
    memory_facts_max: int = Field(default=48, validation_alias="MEMORY_FACTS_MAX")
    memory_summaries_max: int = Field(default=12, validation_alias="MEMORY_SUMMARIES_MAX")
    memory_summary_max_chars: int = Field(default=480, validation_alias="MEMORY_SUMMARY_MAX_CHARS")
    memory_summary_min_messages: int = Field(
        default=6, validation_alias="MEMORY_SUMMARY_MIN_MESSAGES"
    )
    memory_summary_user_limit: int = Field(
        default=3, validation_alias="MEMORY_SUMMARY_USER_LIMIT"
    )
    memory_summary_assistant_limit: int = Field(
        default=2, validation_alias="MEMORY_SUMMARY_ASSISTANT_LIMIT"
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        sources: list[PydanticBaseSettingsSource] = [
            init_settings,
            env_settings,
            dotenv_settings,
        ]
        toml_path = os.getenv("APP_CONFIG_TOML")
        if toml_path:
            sources.append(
                TomlConfigSettingsSource(
                    settings_cls=settings_cls,
                    toml_file=Path(toml_path),
                )
            )
        sources.append(file_secret_settings)
        return tuple(sources)


def _normalize_origins(origins: Iterable[str] | str | None) -> list[str]:
    if origins is None:
        return ["*"]
    if isinstance(origins, str):
        if origins.strip() == "*":
            return ["*"]
        return [item.strip() for item in origins.split(",") if item.strip()]
    return list(origins)


@lru_cache
def get_settings() -> AppSettings:
    settings = AppSettings()
    settings.cors_allow_origins = _normalize_origins(settings.cors_allow_origins)
    return settings


Settings = AppSettings
