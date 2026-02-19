from __future__ import annotations

from pydantic import BaseModel


class CreateOrderRequest(BaseModel):
    plan_type: str  # "token_pack" or "subscription" or "trial"
    plan_id: str  # e.g., "50_tokens", "100_tokens", "monthly_299"


class CreateOrderResponse(BaseModel):
    success: bool
    order_id: str = ""
    amount: int = 0  # in paise
    currency: str = "INR"
    key_id: str = ""
    error: str | None = None


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class Plan(BaseModel):
    id: str
    name: str
    type: str  # "token_pack" or "subscription"
    price_inr: int
    tokens: int = 0
    description: str = ""
