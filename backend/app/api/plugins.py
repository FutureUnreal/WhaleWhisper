from fastapi import APIRouter

from app.api.provider_catalog_schemas import PluginCatalogResponse, PluginDesc
from app.services.catalogs.plugin_catalog import get_plugin_catalog

router = APIRouter(prefix="/plugins", tags=["plugins"])


@router.get("/catalog", response_model=PluginCatalogResponse)
async def list_plugin_catalog() -> PluginCatalogResponse:
    catalog = get_plugin_catalog()
    plugins = [
        PluginDesc(
            id=plugin.id,
            name=plugin.name,
            version=plugin.version,
            description=plugin.description,
            providers=plugin.providers,
            metadata=plugin.metadata,
        )
        for plugin in catalog.list()
    ]
    return PluginCatalogResponse(plugins=plugins)
