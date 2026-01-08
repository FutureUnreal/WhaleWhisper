from app.app_factory import create_app
from .api.agent import router as agent_router
from .api.asr import router as asr_router
from .api.llm import router as llm_router
from .api.memory import router as memory_router
from .api.plugins import router as plugins_router
from .api.providers import router as providers_router
from .api.routes import router
from .api.tts import router as tts_router
app = create_app()
app.include_router(router)
app.include_router(providers_router, prefix="/api")
app.include_router(asr_router, prefix="/api")
app.include_router(tts_router, prefix="/api")
app.include_router(llm_router, prefix="/api")
app.include_router(agent_router, prefix="/api")
app.include_router(memory_router, prefix="/api")
app.include_router(plugins_router, prefix="/api")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
