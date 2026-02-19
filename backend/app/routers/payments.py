from __future__ import annotations

"""Payments router -- Razorpay integration."""

from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.schemas.payments import CreateOrderRequest, CreateOrderResponse, VerifyPaymentRequest
from app.services.payment_service import (
    create_razorpay_order, verify_razorpay_payment, fulfill_payment, get_all_plans,
)

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/plans")
async def list_plans():
    return {"plans": get_all_plans()}


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_order(req: CreateOrderRequest, user: dict = Depends(get_current_user)):
    result = create_razorpay_order(req.plan_id)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Payment failed"))
    return CreateOrderResponse(**result)


@router.post("/verify")
async def verify_payment(req: VerifyPaymentRequest, user: dict = Depends(get_current_user)):
    is_valid = verify_razorpay_payment(
        req.razorpay_order_id,
        req.razorpay_payment_id,
        req.razorpay_signature,
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    plan_id = req.razorpay_order_id.split("_")[-1] if "_" in req.razorpay_order_id else ""

    result = fulfill_payment(
        client_id=user["id"],
        plan_id=plan_id,
        razorpay_order_id=req.razorpay_order_id,
        razorpay_payment_id=req.razorpay_payment_id,
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Fulfillment failed"))

    return {"success": True, "tokens_added": result.get("tokens_added", 0)}
