from __future__ import annotations

"""Meta Pixel Conversions API router — server-side event forwarding."""

import logging

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.middleware.auth import get_current_user
from app.services.meta_pixel_service import send_event, build_user_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/meta-pixel", tags=["Meta Pixel"])


class MetaPixelEventRequest(BaseModel):
    event_name: str
    event_id: str
    value: float | None = None
    currency: str | None = None
    event_source_url: str | None = None


@router.post("/event")
async def track_event(body: MetaPixelEventRequest, request: Request, user=Depends(get_current_user)):
    """Forward a conversion event to Meta CAPI for deduplication with browser pixel."""
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else None
    )
    ua = request.headers.get("user-agent")

    user_data = build_user_data(
        email=user.get("email"),
        phone=user.get("phone"),
        ip=ip,
        user_agent=ua,
    )

    custom_data = {}
    if body.value is not None:
        custom_data["value"] = body.value
    if body.currency:
        custom_data["currency"] = body.currency

    send_event(
        event_name=body.event_name,
        event_id=body.event_id,
        user_data=user_data,
        custom_data=custom_data or None,
        event_source_url=body.event_source_url,
    )

    return {"success": True}
