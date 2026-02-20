from __future__ import annotations

from pydantic import BaseModel


class SendOtpRequest(BaseModel):
    phone: str


class SendOtpResponse(BaseModel):
    success: bool
    message: str


class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str


class VerifyOtpResponse(BaseModel):
    success: bool
    access_token: str
    refresh_token: str
    user: dict


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token from frontend


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
