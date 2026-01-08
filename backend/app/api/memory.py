from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.memory import MemoryScope, MemoryService

router = APIRouter(prefix="/memory", tags=["memory"])
memory_service = MemoryService()


class MemoryFactDesc(BaseModel):
    id: int
    content: str
    tags: List[str] = Field(default_factory=list)
    created_at: int


class MemoryCandidateDesc(BaseModel):
    id: int
    content: str
    reason: str
    status: str
    created_at: int


class MemorySummaryDesc(BaseModel):
    id: int
    content: str
    created_at: int
    session_id: str


class MemoryFactListResponse(BaseModel):
    facts: List[MemoryFactDesc] = Field(default_factory=list)


class MemoryCandidateListResponse(BaseModel):
    candidates: List[MemoryCandidateDesc] = Field(default_factory=list)


class MemorySummaryListResponse(BaseModel):
    summaries: List[MemorySummaryDesc] = Field(default_factory=list)


class MemoryExportResponse(BaseModel):
    facts: List[Dict[str, Any]] = Field(default_factory=list)
    summaries: List[Dict[str, Any]] = Field(default_factory=list)


class MemoryImportRequest(BaseModel):
    facts: List[Dict[str, Any]] = Field(default_factory=list)
    summaries: List[Dict[str, Any]] = Field(default_factory=list)


class MemoryImportResponse(BaseModel):
    facts: int
    summaries: int


class MemoryActionResponse(BaseModel):
    ok: bool


class MemoryCandidateActionResponse(BaseModel):
    ok: bool
    fact: Optional[MemoryFactDesc] = None


@router.get("/facts", response_model=MemoryFactListResponse)
async def list_memory_facts(
    user_id: str = Query(default="default"),
    profile_id: str = Query(default="default"),
    limit: int = Query(default=50, ge=1, le=500),
) -> MemoryFactListResponse:
    scope = _build_scope(user_id=user_id, profile_id=profile_id)
    facts = memory_service.list_facts(scope, limit=limit)
    return MemoryFactListResponse(
        facts=[
            MemoryFactDesc(
                id=fact.id,
                content=fact.content,
                tags=fact.tags,
                created_at=fact.created_at,
            )
            for fact in facts
        ]
    )


@router.delete("/facts/{fact_id}", response_model=MemoryActionResponse)
async def delete_memory_fact(
    fact_id: int,
    user_id: str = Query(default="default"),
    profile_id: str = Query(default="default"),
) -> MemoryActionResponse:
    scope = _build_scope(user_id=user_id, profile_id=profile_id)
    ok = memory_service.delete_fact(scope, fact_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory fact not found")
    return MemoryActionResponse(ok=True)


@router.get("/candidates", response_model=MemoryCandidateListResponse)
async def list_memory_candidates(
    user_id: str = Query(default="default"),
    profile_id: str = Query(default="default"),
    status: str = Query(default="pending"),
    limit: int = Query(default=50, ge=1, le=500),
) -> MemoryCandidateListResponse:
    scope = _build_scope(user_id=user_id, profile_id=profile_id)
    candidates = memory_service.list_candidates(scope, status=status, limit=limit)
    return MemoryCandidateListResponse(
        candidates=[
            MemoryCandidateDesc(
                id=candidate.id,
                content=candidate.content,
                reason=candidate.reason,
                status=candidate.status,
                created_at=candidate.created_at,
            )
            for candidate in candidates
        ]
    )


@router.get("/summaries", response_model=MemorySummaryListResponse)
async def list_memory_summaries(
    user_id: str = Query(default="default"),
    profile_id: str = Query(default="default"),
    limit: int = Query(default=50, ge=1, le=500),
) -> MemorySummaryListResponse:
    scope = _build_scope(user_id=user_id, profile_id=profile_id)
    summaries = memory_service.list_summaries(scope, limit=limit)
    return MemorySummaryListResponse(
        summaries=[
            MemorySummaryDesc(
                id=summary.id,
                content=summary.content,
                created_at=summary.created_at,
                session_id=summary.session_id,
            )
            for summary in summaries
        ]
    )


@router.delete("/summaries/{summary_id}", response_model=MemoryActionResponse)
async def delete_memory_summary(
    summary_id: int,
    user_id: str = Query(default="default"),
    profile_id: str = Query(default="default"),
) -> MemoryActionResponse:
    scope = _build_scope(user_id=user_id, profile_id=profile_id)
    ok = memory_service.delete_summary(scope, summary_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory summary not found")
    return MemoryActionResponse(ok=True)


@router.post("/candidates/{candidate_id}/accept", response_model=MemoryCandidateActionResponse)
async def accept_memory_candidate(
    candidate_id: int,
    user_id: str = Query(default="default"),
    profile_id: str = Query(default="default"),
) -> MemoryCandidateActionResponse:
    scope = _build_scope(user_id=user_id, profile_id=profile_id)
    fact = memory_service.accept_candidate(scope, candidate_id)
    if not fact:
        raise HTTPException(status_code=404, detail="Memory candidate not found")
    return MemoryCandidateActionResponse(
        ok=True,
        fact=MemoryFactDesc(
            id=fact.id,
            content=fact.content,
            tags=fact.tags,
            created_at=fact.created_at,
        ),
    )


@router.post("/candidates/{candidate_id}/reject", response_model=MemoryActionResponse)
async def reject_memory_candidate(
    candidate_id: int,
    user_id: str = Query(default="default"),
    profile_id: str = Query(default="default"),
) -> MemoryActionResponse:
    scope = _build_scope(user_id=user_id, profile_id=profile_id)
    ok = memory_service.reject_candidate(scope, candidate_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory candidate not found")
    return MemoryActionResponse(ok=True)


@router.get("/export", response_model=MemoryExportResponse)
async def export_memory(
    user_id: str = Query(default="default"),
    profile_id: str = Query(default="default"),
    facts_limit: int = Query(default=200, ge=1, le=2000),
    summaries_limit: int = Query(default=200, ge=1, le=2000),
) -> MemoryExportResponse:
    scope = _build_scope(user_id=user_id, profile_id=profile_id)
    payload = memory_service.export_data(
        scope,
        facts_limit=facts_limit,
        summaries_limit=summaries_limit,
    )
    return MemoryExportResponse(**payload)


@router.post("/import", response_model=MemoryImportResponse)
async def import_memory(
    request: MemoryImportRequest,
    user_id: str = Query(default="default"),
    profile_id: str = Query(default="default"),
) -> MemoryImportResponse:
    scope = _build_scope(user_id=user_id, profile_id=profile_id)
    stats = memory_service.import_data(scope, facts=request.facts, summaries=request.summaries)
    return MemoryImportResponse(**stats)


def _build_scope(*, user_id: str, profile_id: str) -> MemoryScope:
    return MemoryScope(session_id="default", user_id=user_id or "default", profile_id=profile_id or "default")
