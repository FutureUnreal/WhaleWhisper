from fastapi import FastAPI

from app.services.engines.loader import bootstrap_engines


def init_app(app: FastAPI) -> None:
    bootstrap_engines()
