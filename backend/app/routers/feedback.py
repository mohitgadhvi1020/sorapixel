from __future__ import annotations

"""Generation feedback router — collects thumbs up/down, text, and audio feedback per image."""

import uuid
import logging
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from openai import OpenAI

from app.middleware.auth import get_current_user
from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feedback", tags=["Feedback"])


# ── Pydantic models ──────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    generation_id: str
    rating: str  # "up" or "down"
    category: str | None = None
    categories: list[str] | None = None
    comment: str | None = None
    image_label: str | None = None
    image_url: str | None = None
    flow_type: str | None = None
    prompt_used: str | None = None


class FeedbackResponse(BaseModel):
    success: bool
    feedback_id: str | None = None


class AudioFeedbackResponse(BaseModel):
    success: bool
    feedback_id: str | None = None
    transcription: str | None = None
    summary_points: list[str] | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_openai() -> OpenAI:
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")
    return OpenAI(api_key=settings.openai_api_key)


def _transcribe_audio(client: OpenAI, audio_bytes: bytes, filename: str) -> str:
    suffix = ".webm"
    if filename:
        for ext in (".webm", ".mp4", ".wav", ".ogg", ".m4a", ".mp3"):
            if filename.lower().endswith(ext):
                suffix = ext
                break

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        tmp.write(audio_bytes)
        tmp.flush()
        tmp.seek(0)
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=open(tmp.name, "rb"),
            language="en",
        )
    return transcript.text.strip()


def _summarize_feedback(client: OpenAI, transcription: str) -> list[str]:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.3,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an assistant that summarizes user feedback about AI-generated product photography. "
                    "Convert the transcribed voice feedback into concise bullet points. "
                    "Each bullet should be one clear, actionable observation. "
                    "Return ONLY the bullet points, one per line, prefixed with '- '. "
                    "If the feedback is positive, summarize what the user liked. "
                    "Keep it to 3-6 bullets maximum."
                ),
            },
            {"role": "user", "content": f"Transcribed feedback:\n\n{transcription}"},
        ],
    )

    raw = response.choices[0].message.content or ""
    points = [
        line.lstrip("- ").strip()
        for line in raw.strip().splitlines()
        if line.strip() and line.strip().startswith("-")
    ]
    return points if points else [raw.strip()] if raw.strip() else []


# ── Routes ────────────────────────────────────────────────────────────────────

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

        row = {
            "id": feedback_id,
            "client_id": user["id"],
            "generation_id": req.generation_id,
            "rating": req.rating,
            "category": merged_category,
            "comment": req.comment,
            "image_label": req.image_label,
            "image_url": req.image_url,
            "flow_type": req.flow_type,
            "prompt_used": req.prompt_used,
        }
        sb.table("generation_feedback").insert(row).execute()
        return FeedbackResponse(success=True, feedback_id=feedback_id)
    except Exception as e:
        logger.error(f"Feedback submission failed: {e}")
        return FeedbackResponse(success=False)


@router.post("/audio", response_model=AudioFeedbackResponse)
async def submit_audio_feedback(
    audio: UploadFile = File(...),
    generation_id: str = Form(...),
    rating: str = Form("down"),
    image_url: str = Form(None),
    flow_type: str = Form(None),
    prompt_used: str = Form(None),
    image_label: str = Form(None),
    user: dict = Depends(get_current_user),
):
    """Accept audio blob, transcribe via Whisper, summarize via GPT, and store."""
    if rating not in ("up", "down"):
        raise HTTPException(status_code=400, detail="Rating must be 'up' or 'down'")

    audio_bytes = await audio.read()
    if len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Audio file is too small or empty")

    try:
        client = _get_openai()

        transcription = _transcribe_audio(client, audio_bytes, audio.filename or "audio.webm")
        if not transcription:
            raise HTTPException(status_code=422, detail="Could not transcribe audio — no speech detected")

        summary_points = _summarize_feedback(client, transcription)

        sb = get_supabase()
        feedback_id = str(uuid.uuid4())

        row = {
            "id": feedback_id,
            "client_id": user["id"],
            "generation_id": generation_id,
            "rating": rating,
            "comment": transcription,
            "transcription": transcription,
            "summary_points": summary_points,
            "image_label": image_label,
            "image_url": image_url,
            "flow_type": flow_type,
            "prompt_used": prompt_used,
        }
        sb.table("generation_feedback").insert(row).execute()

        return AudioFeedbackResponse(
            success=True,
            feedback_id=feedback_id,
            transcription=transcription,
            summary_points=summary_points,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio feedback submission failed: {e}")
        return AudioFeedbackResponse(success=False)


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
