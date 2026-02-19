from __future__ import annotations

from pydantic import BaseModel


class GenerateStudioRequest(BaseModel):
    image_base64: str
    style: str | None = None
    custom_prompt: str | None = None
    aspect_ratio_id: str | None = None
    isolate_product: bool = True
    logo_base64: str | None = None


class GeneratePackRequest(BaseModel):
    image_base64: str
    style: str | None = None
    custom_prompt: str | None = None
    aspect_ratio_id: str | None = None
    isolate_product: bool = True
    logo_base64: str | None = None


class GenerateInfoRequest(BaseModel):
    image_base64: str
    info_type: str  # "features" or "dimensions"
    aspect_ratio_id: str | None = None


class ImageResult(BaseModel):
    base64: str
    mime_type: str = "image/png"
    label: str = ""


class GenerateResponse(BaseModel):
    success: bool
    images: list[ImageResult] = []
    error: str | None = None
    credits_remaining: int | None = None


class RefinePromptRequest(BaseModel):
    raw_prompt: str
