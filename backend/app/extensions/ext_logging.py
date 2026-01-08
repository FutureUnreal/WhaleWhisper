import logging

from fastapi import FastAPI

from app.core.settings import get_settings


def init_app(app: FastAPI) -> None:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())
