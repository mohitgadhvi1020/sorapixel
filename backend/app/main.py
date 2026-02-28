from __future__ import annotations

"""SoraiPixel Backend API -- FastAPI application entry point."""

import logging
from importlib import import_module
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers under /api/v1 — imported individually to spread memory load
prefix = settings.api_v1_prefix
_ROUTER_MODULES = [
    "auth", "users", "studio", "jewelry", "catalogue", "credits",
    "payments", "admin", "projects", "sessions", "feed", "media",
    "blog", "brands", "themes", "feedback",
]
for _mod_name in _ROUTER_MODULES:
    _mod = import_module(f"app.routers.{_mod_name}")
    app.include_router(_mod.router, prefix=prefix)


@app.get("/")
async def root():
    return {"name": settings.app_name, "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
