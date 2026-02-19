from __future__ import annotations

"""SoraPixel Backend API -- FastAPI application entry point."""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import auth, users, studio, jewelry, catalogue, credits, payments, admin, projects, feed, media

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

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

# Mount all routers under /api/v1
prefix = settings.api_v1_prefix
app.include_router(auth.router, prefix=prefix)
app.include_router(users.router, prefix=prefix)
app.include_router(studio.router, prefix=prefix)
app.include_router(jewelry.router, prefix=prefix)
app.include_router(catalogue.router, prefix=prefix)
app.include_router(credits.router, prefix=prefix)
app.include_router(payments.router, prefix=prefix)
app.include_router(admin.router, prefix=prefix)
app.include_router(projects.router, prefix=prefix)
app.include_router(feed.router, prefix=prefix)
app.include_router(media.router, prefix=prefix)


@app.get("/")
async def root():
    return {"name": settings.app_name, "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
