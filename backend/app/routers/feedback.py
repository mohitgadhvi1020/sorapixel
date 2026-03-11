from __future__ import annotations

"""Generation feedback router — collects thumbs up/down + optional comments for model training."""

import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.middleware.auth import get_current_user
from app.database import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feedback", tags=["Feedback"])


class FeedbackRequest(BaseModel):
    generation_id: str
    rating: str  # "up" or "down"
    category: str | None = None
    categories: list[str] | None = None
    comment: str | None = None
    image_label: str | None = None


class FeedbackResponse(BaseModel):
    success: bool
    feedback_id: str | None = None


@router.post("", response_model=FeedbackResponse)
async def submit_feedback(req: FeedbackRequest, user: dict = Depends(get_current_user)):
    if req.rating not in ("up", "down"):
        raise HTTPException(status_code=400, detail="Rating must be 'up' or 'down'")

    try:
        sb = get_supabase()
        feedback_id = str(uuid.uuid4())
        merged_category = req.category
        if req.categories:
            merged_category = ",".join(req.categories)

        sb.table("generation_feedback").insert({
            "id": feedback_id,
            "client_id": user["id"],
            "generation_id": req.generation_id,
            "rating": req.rating,
            "category": merged_category,
            "comment": req.comment,
            "image_label": req.image_label,
        }).execute()
        return FeedbackResponse(success=True, feedback_id=feedback_id)
    except Exception as e:
        logger.error(f"Feedback submission failed: {e}")
        return FeedbackResponse(success=False)


@router.get("/check/{generation_id}")
async def check_feedback(generation_id: str, user: dict = Depends(get_current_user)):
    """Check if user already submitted feedback for a generation."""
    try:
        sb = get_supabase()
        result = sb.table("generation_feedback").select("id,rating").eq(
            "generation_id", generation_id
        ).eq("client_id", user["id"]).execute()
        return {"has_feedback": len(result.data) > 0, "feedback": result.data}
    except Exception as e:
        logger.error(f"Feedback check failed: {e}")
        return {"has_feedback": False, "feedback": []}
