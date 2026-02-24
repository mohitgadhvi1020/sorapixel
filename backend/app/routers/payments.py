from __future__ import annotations

"""Payments router — Razorpay order creation, verification, and webhook."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.middleware.auth import get_current_user
from app.services.payment_service import (
    get_all_plans,
    create_razorpay_order,
    verify_razorpay_payment,
    handle_razorpay_webhook,
)
from app.services.credit_service import JEWELRY_PRICING

router = APIRouter(prefix="/payments", tags=["Payments"])


class CreateOrderRequest(BaseModel):
    plan_id: str
    currency: str = "INR"


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.get("/plans")
async def list_plans():
    return {
        "plans": get_all_plans(),
        "operation_costs": JEWELRY_PRICING,
    }


@router.post("/create-order")
async def create_order(
    body: CreateOrderRequest,
    user: dict = Depends(get_current_user),
):
    result = create_razorpay_order(client_id=user["id"], plan_id=body.plan_id, currency=body.currency)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Order creation failed"))
    return result


@router.post("/verify")
async def verify_payment(
    body: VerifyPaymentRequest,
    user: dict = Depends(get_current_user),
):
    result = verify_razorpay_payment(
        razorpay_order_id=body.razorpay_order_id,
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_signature=body.razorpay_signature,
        client_id=user["id"],
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Verification failed"))
    return result


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """Razorpay sends payment events here. No auth — verified via signature."""
    signature = request.headers.get("x-razorpay-signature", "")
    payload = await request.json()
    result = handle_razorpay_webhook(payload=payload, signature=signature)
    return result
