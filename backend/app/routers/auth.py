from __future__ import annotations

"""Auth router -- OTP-based phone authentication."""

from fastapi import APIRouter, HTTPException
from app.schemas.auth import (
    SendOtpRequest, SendOtpResponse,
    VerifyOtpRequest, VerifyOtpResponse,
    RefreshRequest, RefreshResponse,
)
from app.services.otp_service import send_otp, verify_otp
from app.utils.security import create_access_token, create_refresh_token, decode_token
from app.database import get_supabase
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _get_or_create_user(phone: str) -> dict:
    """Find existing user by phone or create a new one."""
    sb = get_supabase()
    settings = get_settings()

    result = sb.table("clients").select("*").eq("phone", phone).maybe_single().execute()
    if result.data:
        return result.data

    user_data = {
        "phone": phone,
        "email": f"{phone}@phone.sorapixel.com",
        "company_name": "",
        "contact_name": "",
        "is_active": True,
        "is_admin": phone in settings.admin_phone_list,
        "token_balance": 0,
        "studio_free_used": 0,
        "allowed_sections": ["studio", "jewelry"],
        "subscription_plan": "free",
        "apply_branding": False,
    }

    try:
        auth_result = sb.auth.admin.create_user({
            "email": user_data["email"],
            "password": f"otp_user_{phone}",
            "email_confirm": True,
            "user_metadata": {"phone": phone},
        })
        user_id = auth_result.user.id
    except Exception:
        users = sb.auth.admin.list_users()
        existing = next((u for u in users if u.email == user_data["email"]), None)
        if existing:
            user_id = existing.id
        else:
            raise

    user_data["id"] = user_id
    sb.table("clients").upsert(user_data, on_conflict="id").execute()

    result = sb.table("clients").select("*").eq("id", user_id).single().execute()
    return result.data


@router.post("/send-otp", response_model=SendOtpResponse)
async def send_otp_endpoint(req: SendOtpRequest):
    phone = req.phone.strip().replace("+91", "").replace(" ", "")
    if len(phone) != 10 or not phone.isdigit():
        raise HTTPException(status_code=400, detail="Invalid phone number. Enter 10-digit Indian mobile number.")

    result = send_otp(phone)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])

    return SendOtpResponse(success=True, message=result["message"])


@router.post("/verify-otp", response_model=VerifyOtpResponse)
async def verify_otp_endpoint(req: VerifyOtpRequest):
    phone = req.phone.strip().replace("+91", "").replace(" ", "")
    if not verify_otp(phone, req.otp.strip()):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")

    user = _get_or_create_user(phone)

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token_data = {
        "sub": user["id"],
        "phone": phone,
        "is_admin": user.get("is_admin", False),
    }

    return VerifyOtpResponse(
        success=True,
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user={
            "id": user["id"],
            "phone": phone,
            "name": user.get("contact_name", ""),
            "company_name": user.get("company_name", ""),
            "is_admin": user.get("is_admin", False),
            "token_balance": user.get("token_balance", 0),
        },
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(req: RefreshRequest):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    new_access = create_access_token({
        "sub": payload["sub"],
        "phone": payload.get("phone", ""),
        "is_admin": payload.get("is_admin", False),
    })
    return RefreshResponse(access_token=new_access)


@router.post("/logout")
async def logout():
    return {"success": True, "message": "Logged out"}
