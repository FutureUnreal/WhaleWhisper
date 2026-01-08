from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from app.core.settings import get_settings


@dataclass
class PluginSpec:
    id: str
    name: str
    version: Optional[str] = None
    description: Optional[str] = None
    providers: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class PluginCatalog:
    def __init__(self, plugins: List[PluginSpec]):
        self._plugins = plugins
        self._index = {plugin.id: plugin for plugin in plugins}

    def list(self) -> List[PluginSpec]:
        return list(self._plugins)

    def get(self, plugin_id: str) -> Optional[PluginSpec]:
        return self._index.get(plugin_id)


def _load_catalog_file(path: Path) -> List[PluginSpec]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    if not isinstance(data, dict):
        return []
    entries = data.get("plugins")
    if not isinstance(entries, list):
        return []
    plugins: List[PluginSpec] = []
    for item in entries:
        if not isinstance(item, dict):
            continue
        plugin_id = str(item.get("id") or "")
        name = str(item.get("name") or plugin_id)
        if not plugin_id:
            continue
        providers = item.get("providers") if isinstance(item.get("providers"), list) else []
        plugins.append(
            PluginSpec(
                id=plugin_id,
                name=name,
                version=item.get("version"),
                description=item.get("description"),
                providers=[str(p) for p in providers if p],
                metadata=item.get("metadata") if isinstance(item.get("metadata"), dict) else {},
            )
        )
    return plugins


@lru_cache
def get_plugin_catalog() -> PluginCatalog:
    settings = get_settings()
    base_dir = Path(__file__).resolve().parents[3]
    path = Path(settings.plugin_catalog_path)
    if not path.is_absolute():
        path = base_dir / path
    plugins = _load_catalog_file(path)
    return PluginCatalog(plugins)
