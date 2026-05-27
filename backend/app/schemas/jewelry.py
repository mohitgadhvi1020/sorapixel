from __future__ import annotations

from typing import Literal
from pydantic import BaseModel


class GenerateJewelryRequest(BaseModel):
    image_base64: str
    jewelry_type: str = "necklace"
    background: str = "black_velvet"
    aspect_ratio_id: str | None = None
    step: str = "hero"
    alt_images_base64: list[str] | None = None
    special_instructions: str | None = None
    quality: Literal["standard", "pro", "ultra"] = "standard"
    session_id: str | None = None
    # Theme-based generation fields
    theme_id: str | None = None
    shots: list[dict] | None = None  # [{shot_id, additional_details?, theme_color?}]


class RecolorJewelryRequest(BaseModel):
    image_base64: str
    target_metal: str
    jewelry_type: str = "necklace"
    quality: Literal["standard", "pro", "ultra"] = "standard"
    session_id: str | None = None


class GenerateHdRequest(BaseModel):
    image_base64: str


class RewriteListingRequest(BaseModel):
    image_base64: str
    jewelry_type: str = "necklace"
    session_id: str | None = None


class AutoFixRequest(BaseModel):
    """User-triggered 'Auto-fix' — re-analyzes and repairs product fidelity."""
    image_base64: str          # original input image
    output_base64: str         # the generated image the user is unhappy with
    jewelry_type: str = "necklace"
    background: str = "black_velvet"
    aspect_ratio_id: str | None = None
    special_instructions: str | None = None
    quality: Literal["standard", "pro", "ultra"] = "standard"
    session_id: str | None = None
    theme_id: str | None = None
    shot_id: str | None = None


class InpaintRequest(BaseModel):
    """FLUX Fill inpainting — mask-based background replacement."""
    image_base64: str
    mask_base64: str | None = None  # auto-generated if not provided
    prompt: str = ""
    jewelry_type: str = "necklace"
    background: str = "black_velvet"
    aspect_ratio_id: str | None = None
    session_id: str | None = None


class BrandingRequest(BaseModel):
    image_base64: str
    business_name: str = ""
    phone: str = ""
    background: str = ""
    session_id: str | None = None


