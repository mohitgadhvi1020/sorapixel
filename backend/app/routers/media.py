from __future__ import annotations

"""Media router -- image download, upload, WhatsApp share."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from app.middleware.auth import get_current_user
from app.services.storage_service import get_download_url, download_image_bytes
from app.services.tracking_service import track_download
from app.database import get_supabase

router = APIRouter(prefix="/media", tags=["Media"])


@router.get("/download/{image_id}")
async def download_image(image_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("images").select("storage_path, client_id").eq("id", image_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Image not found")
    if result.data["client_id"] != user["id"] and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    data = download_image_bytes(result.data["storage_path"])
    if not data:
        raise HTTPException(status_code=500, detail="Download failed")

    track_download(user["id"], image_id)

    return Response(
        content=data,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="sorapixel-{image_id}.png"'},
    )


@router.get("/signed-url/{image_id}")
async def get_signed_url(image_id: str, user: dict = Depends(get_current_user)):
    url = get_download_url(user["id"], image_id)
    if not url:
        raise HTTPException(status_code=404, detail="Image not found or access denied")
    return {"url": url}


@router.get("/whatsapp-share/{image_id}")
async def whatsapp_share(image_id: str, user: dict = Depends(get_current_user)):
    """Generate a WhatsApp share link for an image."""
    url = get_download_url(user["id"], image_id)
    if not url:
        raise HTTPException(status_code=404, detail="Image not found")

    share_text = f"Check out this product photo created with SoraPixel! {url}"
    whatsapp_url = f"https://wa.me/?text={share_text}"

    return {"share_url": whatsapp_url, "image_url": url}
