from __future__ import annotations

"""Sessions router — CRUD for session-based workflow persistence."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.middleware.auth import get_current_user
from app.services.session_service import (
    create_session,
    get_session,
    list_sessions,
    delete_session,
    update_session_progress,
)

router = APIRouter(prefix="/sessions", tags=["Sessions"])


class CreateSessionRequest(BaseModel):
    image_base64: str
    jewelry_type: str = "necklace"
    background: str = "black_velvet"
    aspect_ratio_id: str | None = None
    quality: str = "standard"


@router.post("")
async def create(req: CreateSessionRequest, user: dict = Depends(get_current_user)):
    session = create_session(
        client_id=user["id"],
        jewelry_type=req.jewelry_type,
        background=req.background,
        aspect_ratio_id=req.aspect_ratio_id,
        quality=req.quality,
        original_image_b64=req.image_base64,
    )
    if not session:
        raise HTTPException(status_code=500, detail="Failed to create session")
    return session


@router.get("")
async def list_all(
    limit: int = 20,
    offset: int = 0,
    user: dict = Depends(get_current_user),
):
    sessions = list_sessions(user["id"], limit=limit, offset=offset)
    return {"sessions": sessions}


@router.get("/{session_id}")
async def get_one(session_id: str, user: dict = Depends(get_current_user)):
    session = get_session(session_id, user["id"])
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


class UpdateProgressRequest(BaseModel):
    current_step: str | None = None
    pending_inputs: dict | None = None
    jewelry_type: str | None = None
    background: str | None = None
    aspect_ratio_id: str | None = None
    quality: str | None = None


@router.patch("/{session_id}/progress")
async def patch_progress(
    session_id: str,
    req: UpdateProgressRequest,
    user: dict = Depends(get_current_user),
):
    ok = update_session_progress(
        session_id=session_id,
        client_id=user["id"],
        current_step=req.current_step,
        pending_inputs=req.pending_inputs,
        jewelry_type=req.jewelry_type,
        background=req.background,
        aspect_ratio_id=req.aspect_ratio_id,
        quality=req.quality,
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update progress")
    return {"success": True}


@router.delete("/{session_id}")
async def remove(session_id: str, user: dict = Depends(get_current_user)):
    ok = delete_session(session_id, user["id"])
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete session")
    return {"success": True}
