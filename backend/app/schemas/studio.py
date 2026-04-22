from __future__ import annotations

from typing import Literal
from pydantic import BaseModel


class GenerateStudioRequest(BaseModel):
    image_base64: str
    background_id: str | None = "studio"
    aspect_ratio_id: str | None = None
    special_instructions: str | None = None
    quality: Literal["standard", "pro", "ultra"] = "standard"
    studio_session_id: str | None = None


class ImageResult(BaseModel):
    base64: str
    mime_type: str = "image/png"
    label: str = ""


class GenerateResponse(BaseModel):
    success: bool
    images: list[ImageResult] = []
    error: str | None = None
    credits_remaining: int | None = None
