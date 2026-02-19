# SoraPixel - AI Product Photography Platform

AI-powered product photography for jewelry, fashion, and e-commerce. 
Generate studio-quality product photos, catalogue images with AI models, 
and branded marketing materials.

## Architecture

```
soraipixel/
├── backend/           # FastAPI Python API server
│   ├── app/           # Application code
│   │   ├── routers/   # API endpoints
│   │   ├── services/  # Business logic (AI, payments, credits)
│   │   ├── schemas/   # Request/response models
│   │   └── middleware/ # Auth (JWT)
│   └── migrations/    # SQL migrations
├── frontend/          # Next.js web application
│   └── src/
│       ├── app/       # Pages (login, studio, jewelry, catalogue, etc.)
│       ├── components/# React components
│       ├── hooks/     # Custom hooks (useAuth, useCredits)
│       └── lib/       # API client, types
└── src/               # Legacy Next.js monolith (being migrated)
```

## Quick Start

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in credentials
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
npm run dev
```

## Features

### Existing (migrated from Next.js)
- Studio product photography (multiple styles, aspect ratios)
- Jewelry-specific photography (hero, angle, closeup packs)
- Metal recoloring (gold, silver, rose gold)
- HD upscaling via fal.ai
- Virtual try-on (jewelry on person)
- Product listing generation (Shopify-ready)
- Token/credit system
- Admin dashboard

### New (from Flyr feature analysis)
- OTP mobile login (phone + 6-digit OTP)
- User profile (business name, logo, address, branding)
- Multi-category system (Jewelry, Fashion, Accessories, etc.)
- Catalogue/UGC generation (product on AI models)
- Projects management (Photoshoot + Catalogue tabs)
- Daily rewards (2 free tokens/day)
- Razorpay payment integration (token packs + subscriptions)
- Home feed with pre-generated examples
- WhatsApp sharing

## Tech Stack

- **Backend**: FastAPI (Python), Supabase (PostgreSQL + Storage + Auth)
- **Frontend**: Next.js 16, React 19, Tailwind CSS v4
- **AI**: Google Gemini 2.5 Flash, fal.ai
- **Payments**: Razorpay
- **OTP**: MSG91

## API Documentation

Backend Swagger docs: http://localhost:8000/docs
