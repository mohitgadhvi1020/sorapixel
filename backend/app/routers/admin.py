from __future__ import annotations

"""Admin router -- client management, stats, tokens."""

from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import require_admin
from app.schemas.admin import CreateClientRequest, UpdateClientRequest, AddTokensRequest
from app.database import get_supabase
from app.services.credit_service import add_tokens
from app.config import get_settings

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/clients")
async def list_clients(admin: dict = Depends(require_admin)):
    sb = get_supabase()
    result = sb.table("clients").select(
        "id, phone, email, company_name, contact_name, is_active, is_admin, "
        "created_at, allowed_sections, token_balance, studio_free_used, subscription_plan"
    ).order("created_at", desc=True).execute()
    return {"clients": result.data or []}


@router.post("/clients")
async def create_client(req: CreateClientRequest, admin: dict = Depends(require_admin)):
    settings = get_settings()
    sb = get_supabase()

    existing = sb.table("clients").select("id").eq("phone", req.phone).maybe_single().execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Client with this phone already exists")

    email = f"{req.phone}@phone.sorapixel.com"
    try:
        auth_result = sb.auth.admin.create_user({
            "email": email,
            "password": f"admin_created_{req.phone}",
            "email_confirm": True,
        })
        user_id = auth_result.user.id
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create auth user: {e}")

    sb.table("clients").upsert({
        "id": user_id,
        "phone": req.phone,
        "email": email,
        "company_name": req.company_name,
        "contact_name": req.name,
        "is_active": True,
        "is_admin": req.phone in settings.admin_phone_list,
        "allowed_sections": req.allowed_sections,
        "token_balance": 0,
        "studio_free_used": 0,
    }, on_conflict="id").execute()

    return {"success": True, "client_id": user_id}


@router.patch("/clients")
async def update_client(req: UpdateClientRequest, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    updates = {}
    if req.is_active is not None:
        updates["is_active"] = req.is_active
    if req.allowed_sections is not None:
        updates["allowed_sections"] = req.allowed_sections

    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    sb.table("clients").update(updates).eq("id", req.client_id).execute()
    return {"success": True}


@router.post("/tokens")
async def add_tokens_endpoint(req: AddTokensRequest, admin: dict = Depends(require_admin)):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    success = add_tokens(req.client_id, req.amount)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add tokens")
    return {"success": True}


@router.get("/stats")
async def get_stats(admin: dict = Depends(require_admin)):
    sb = get_supabase()

    clients = sb.table("clients").select(
        "id, phone, email, company_name, contact_name, is_active, created_at, "
        "studio_free_used, token_balance, allowed_sections"
    ).order("created_at", desc=True).execute()

    gen_counts = sb.table("generations").select(
        "client_id, id, input_tokens, output_tokens, total_tokens, generation_type"
    ).execute()

    dl_counts = sb.table("downloads").select("client_id, id").execute()
    img_counts = sb.table("images").select("client_id, id").execute()

    stats = []
    for c in (clients.data or []):
        gens = [g for g in (gen_counts.data or []) if g["client_id"] == c["id"]]
        dls = [d for d in (dl_counts.data or []) if d["client_id"] == c["id"]]
        imgs = [i for i in (img_counts.data or []) if i["client_id"] == c["id"]]
        total_tokens = sum(g.get("total_tokens", 0) for g in gens)

        stats.append({
            "id": c["id"],
            "phone": c.get("phone"),
            "email": c.get("email"),
            "company_name": c.get("company_name"),
            "is_active": c.get("is_active"),
            "created_at": c.get("created_at"),
            "total_generations": len(gens),
            "total_tokens_used": total_tokens,
            "total_images": len(imgs),
            "total_downloads": len(dls),
            "token_balance": c.get("token_balance", 0),
        })

    recent = sb.table("generations").select(
        "id, client_id, generation_type, total_tokens, model_used, status, created_at"
    ).order("created_at", desc=True).limit(50).execute()

    total_gens = sum(s["total_generations"] for s in stats)
    total_tokens = sum(s["total_tokens_used"] for s in stats)

    return {
        "client_stats": stats,
        "recent_activity": recent.data or [],
        "totals": {
            "total_clients": len(stats),
            "total_generations": total_gens,
            "total_tokens": total_tokens,
        },
    }
