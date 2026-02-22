from __future__ import annotations

"""Payments router — plans listing. Payment processing is manual (contact admin)."""

from fastapi import APIRouter
from app.services.payment_service import get_all_plans

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/plans")
async def list_plans():
    return {"plans": get_all_plans()}
