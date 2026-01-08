from fastapi import FastAPI

from app.services.catalogs.plugin_catalog import get_plugin_catalog
from app.services.catalogs.provider_catalog import get_provider_catalog


def init_app(app: FastAPI) -> None:
    get_provider_catalog()
    get_plugin_catalog()
