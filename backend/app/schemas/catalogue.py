from __future__ import annotations

from pydantic import BaseModel


class GenerateCatalogueRequest(BaseModel):
    image_base64: str
    model_id: str | None = None
    model_type: str = "indian_woman"
    poses: list[str] = ["standing", "side_view", "back_view", "sitting"]
    background: str = "best_match"
    aspect_ratio_id: str | None = None
    special_instructions: str | None = None
    key_highlights: str | None = None
    additional_images: list[str] = []
    add_logo: bool = False
    include_studio_views: list[str] = []


class AiModel(BaseModel):
    id: str
    name: str
    gender: str
    age_group: str
    thumbnail_url: str


class CatalogueResponse(BaseModel):
    success: bool
    images: list[dict] = []
    error: str | None = None
