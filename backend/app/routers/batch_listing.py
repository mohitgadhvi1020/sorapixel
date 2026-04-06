from __future__ import annotations

"""Batch Listing router — AI-powered product listing generation using shared Gemini service."""

import logging
import json
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.middleware.auth import get_current_user
from app.services.gemini_service import generate_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/batch-listing", tags=["Batch Listing"])

LISTING_JSON_SCHEMA = """{
  "title": "Product title",
  "description": "<p>Paragraph 1...</p><p>Paragraph 2...</p><ul><li>Material: ...</li><li>Stones: ...</li><li>Closure: ...</li></ul>",
  "metaDescription": "Meta description for SEO",
  "altText": "Descriptive alt text",
  "attributes": {
    "jewelryMaterial": "...",
    "gemstoneType": "...",
    "collection": "...",
    "occasion": "...",
    "material": "...",
    "stone": "...",
    "closure": "..."
  }
}"""


class GenerateListingRequest(BaseModel):
    image_base64: str
    prompt: str


class GenerateListingResponse(BaseModel):
    success: bool
    listing: dict | None = None
    token_usage: dict | None = None
    error: str | None = None


def _parse_listing(text: str) -> dict:
    cleaned = text.strip()
    cleaned = re.sub(r"^```json?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip()
    parsed = json.loads(cleaned)
    a = parsed.get("attributes", {})
    return {
        "title": parsed.get("title", ""),
        "description": parsed.get("description", ""),
        "metaDescription": parsed.get("metaDescription", ""),
        "altText": parsed.get("altText", ""),
        "attributes": {
            "jewelryMaterial": a.get("jewelryMaterial", "Metal"),
            "gemstoneType": a.get("gemstoneType", ""),
            "collection": a.get("collection", "[TBD]"),
            "occasion": a.get("occasion", "[TBD]"),
            "material": a.get("material", "[TBD]"),
            "stone": a.get("stone", "None"),
            "closure": a.get("closure", ""),
        },
    }


@router.post("/generate", response_model=GenerateListingResponse)
async def generate_listing(req: GenerateListingRequest, user: dict = Depends(get_current_user)):
    """Generate a product listing from an image using the shared Gemini backend.

    The frontend sends the fully-constructed prompt and base64 image.
    This endpoint handles AI generation only — auth, credits, and storage
    remain in the Next.js API route.
    """
    try:
        mime_match = re.match(r"^data:(image/\w+);base64,", req.image_base64)
        mime = mime_match.group(1) if mime_match else "image/png"
        clean_b64 = re.sub(r"^data:image/\w+;base64,", "", req.image_base64)

        result = generate_text(req.prompt, clean_b64, mime, json_mode=True)

        text = result.get("text", "")
        if not text:
            return GenerateListingResponse(success=False, error="No response from AI")

        listing = _parse_listing(text)
        return GenerateListingResponse(
            success=True,
            listing=listing,
            token_usage=result.get("usage"),
        )
    except json.JSONDecodeError as e:
        logger.error("Failed to parse AI listing response: %s", str(e)[:200])
        return GenerateListingResponse(success=False, error="AI returned invalid JSON. Please try again.")
    except Exception as e:
        logger.error("Batch listing generation failed: %s", str(e)[:300])
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)[:200]}")
