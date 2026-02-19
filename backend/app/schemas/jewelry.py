from __future__ import annotations

from pydantic import BaseModel


class GenerateJewelryRequest(BaseModel):
    image_base64: str
    jewelry_type: str = "necklace"
    background: str = "black_velvet"
    aspect_ratio_id: str | None = None
    step: str = "hero"  # "hero" or "full_pack"
    custom_angle_base64: str | None = None


class RecolorJewelryRequest(BaseModel):
    image_base64: str
    target_metal: str  # "gold", "silver", "rose_gold"
    jewelry_type: str = "necklace"


class GenerateHdRequest(BaseModel):
    image_base64: str


class RewriteListingRequest(BaseModel):
    image_base64: str
    jewelry_type: str = "necklace"


class TryOnRequest(BaseModel):
    jewelry_base64: str
    person_base64: str
    jewelry_type: str = "necklace"
    aspect_ratio_id: str | None = None
