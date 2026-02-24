from __future__ import annotations

from pydantic import BaseModel, Field
from datetime import datetime


class BlogCategoryCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    display_order: int = 0


class BlogCategoryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    display_order: int | None = None


class BlogCategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    display_order: int = 0
    created_at: str | None = None


class BlogPostCreate(BaseModel):
    title: str
    slug: str
    content: dict | None = None
    excerpt: str | None = None
    cover_image_url: str | None = None
    category_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    meta_title: str | None = None
    meta_description: str | None = None
    og_image_url: str | None = None
    status: str = "draft"


class BlogPostUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    content: dict | None = None
    excerpt: str | None = None
    cover_image_url: str | None = None
    category_id: str | None = None
    tags: list[str] | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    og_image_url: str | None = None
    status: str | None = None


class BlogGenerateRequest(BaseModel):
    topic: str
    keywords: list[str] = Field(default_factory=list)
    tone: str = "professional"
    word_count: int = Field(default=1200, ge=300, le=3000)
    category_id: str | None = None
    auto_publish: bool = False


class BlogPostOut(BaseModel):
    id: str
    title: str
    slug: str
    content: dict | None = None
    excerpt: str | None = None
    cover_image_url: str | None = None
    category_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    meta_title: str | None = None
    meta_description: str | None = None
    og_image_url: str | None = None
    status: str = "draft"
    published_at: str | None = None
    author_id: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
