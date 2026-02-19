# SoraPixel Backend API

FastAPI backend for the SoraPixel AI product photography platform.

## Quick Start

```bash
# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment
cp .env.example .env
# Edit .env with your Supabase, Gemini, and other credentials

# 4. Run the database migration
# Go to Supabase SQL Editor and run: migrations/002_add_new_tables.sql

# 5. Start the server
uvicorn app.main:app --reload --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
  app/
    main.py           # FastAPI entry point
    config.py          # Settings (from .env)
    database.py        # Supabase client
    routers/           # API route handlers
      auth.py          # OTP login + JWT
      users.py         # Profile CRUD
      studio.py        # Studio photography
      jewelry.py       # Jewelry photography
      catalogue.py     # Catalogue/UGC (product on AI model)
      credits.py       # Credit balance, daily rewards
      payments.py      # Razorpay integration
      admin.py         # Admin dashboard
      projects.py      # Project management
      feed.py          # Home feed
      media.py         # Image download/share
    services/          # Business logic
      gemini_service.py    # Google Gemini AI
      fal_service.py       # fal.ai (HD upscale, bg removal)
      image_service.py     # Pillow image processing
      otp_service.py       # OTP send/verify
      credit_service.py    # Token management
      payment_service.py   # Razorpay
      prompt_service.py    # All AI prompt templates
      storage_service.py   # Supabase Storage
      tracking_service.py  # Usage tracking
    middleware/
      auth.py          # JWT authentication
    schemas/           # Pydantic request/response models
    utils/
      security.py      # JWT token creation/verification
  migrations/          # SQL migrations for Supabase
  requirements.txt
  .env.example
```

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/send-otp | Send OTP to phone |
| POST | /api/v1/auth/verify-otp | Verify OTP, get JWT |
| GET | /api/v1/users/me | Get profile |
| PUT | /api/v1/users/me | Update profile |
| POST | /api/v1/studio/generate | Generate studio image |
| POST | /api/v1/studio/generate-pack | Generate 3-image pack |
| POST | /api/v1/jewelry/generate | Generate jewelry photo |
| POST | /api/v1/jewelry/recolor | Recolor metal |
| POST | /api/v1/catalogue/generate | Generate catalogue/UGC |
| GET | /api/v1/credits/balance | Check credit balance |
| POST | /api/v1/credits/claim-daily | Claim daily reward |
| POST | /api/v1/payments/create-order | Start Razorpay payment |
| GET | /api/v1/feed | Home feed |

Full API docs at `/docs` when running.
