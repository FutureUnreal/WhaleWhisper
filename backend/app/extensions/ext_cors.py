from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.settings import get_settings


def init_app(app: FastAPI) -> None:
    settings = get_settings()
    allow_origins = settings.cors_allow_origins
    allow_credentials = True
    if "*" in allow_origins:
        allow_credentials = False
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )
