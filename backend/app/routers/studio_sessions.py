from __future__ import annotations

"""Studio sessions router — CRUD + progress updates for in-progress studio work."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.middleware.auth import get_current_user
from app.services.studio_session_service import (
    create_studio_session,
    update_studio_session,
    get_studio_session,
    list_studio_sessions,
    delete_studio_session,
)

router = APIRouter(prefix="/studio-sessions", tags=["Studio Sessions"])


class CreateStudioSessionRequest(BaseModel):
    image_base64: str | None = None
    background_id: str | None = None
    quality: str = "pro"
    aspect_ratio_id: str | None = None
    special_instructions: str | None = None
    current_step: str | None = "configure"
    pending_inputs: dict | None = None


class UpdateStudioSessionRequest(BaseModel):
    image_base64: str | None = None
    background_id: str | None = None
    quality: str | None = None
    aspect_ratio_id: str | None = None
    special_instructions: str | None = None
    current_step: str | None = None
    pending_inputs: dict | None = None
    result_project_id: str | None = None


@router.post("")
async def create(req: CreateStudioSessionRequest, user: dict = Depends(get_current_user)):
    session = create_studio_session(
        client_id=user["id"],
        image_base64=req.image_base64,
        background_id=req.background_id,
        quality=req.quality,
        aspect_ratio_id=req.aspect_ratio_id,
        special_instructions=req.special_instructions,
        current_step=req.current_step,
        pending_inputs=req.pending_inputs,
    )
    if not session:
        raise HTTPException(status_code=500, detail="Failed to create studio session")
    return session


@router.get("")
async def list_all(limit: int = 20, offset: int = 0, user: dict = Depends(get_current_user)):
    return {"sessions": list_studio_sessions(user["id"], limit=limit, offset=offset)}


@router.get("/{session_id}")
async def get_one(session_id: str, user: dict = Depends(get_current_user)):
    session = get_studio_session(session_id, user["id"])
    if not session:
        raise HTTPException(status_code=404, detail="Studio session not found")
    return session


@router.patch("/{session_id}")
async def update_one(
    session_id: str,
    req: UpdateStudioSessionRequest,
    user: dict = Depends(get_current_user),
):
    ok = update_studio_session(
        session_id=session_id,
        client_id=user["id"],
        image_base64=req.image_base64,
        background_id=req.background_id,
        quality=req.quality,
        aspect_ratio_id=req.aspect_ratio_id,
        special_instructions=req.special_instructions,
        current_step=req.current_step,
        pending_inputs=req.pending_inputs,
        result_project_id=req.result_project_id,
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update studio session")
    return {"success": True}


@router.delete("/{session_id}")
async def remove(session_id: str, user: dict = Depends(get_current_user)):
    ok = delete_studio_session(session_id, user["id"])
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete studio session")
    return {"success": True}
