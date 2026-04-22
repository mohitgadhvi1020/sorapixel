#!/bin/bash
# ── SoraPixel Cloud Run Deploy Script ─────────────────────────────────────────
# Usage:
#   ./deploy.sh backend    — deploy backend only
#   ./deploy.sh frontend   — deploy frontend only
#   ./deploy.sh all        — deploy both

set -e

export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"
PROJECT="sorapixel-prod"
REGION="us-central1"
REPO="us-central1-docker.pkg.dev/$PROJECT/cloud-run-source-deploy"
TAG=$(date +%Y%m%d-%H%M%S)

deploy_backend() {
  echo "🔨 Building backend..."
  gcloud builds submit backend/ \
    --tag "$REPO/sorapixel-backend:$TAG" \
    --region "$REGION" \
    --project "$PROJECT" \
    --quiet

  echo "🚀 Deploying backend to Cloud Run..."
  gcloud run deploy sorapixel-backend \
    --image "$REPO/sorapixel-backend:$TAG" \
    --region "$REGION" \
    --project "$PROJECT" \
    --env-vars-file backend/env.yaml \
    --service-account sorapixel-backend@sorapixel-prod.iam.gserviceaccount.com \
    --min-instances=1 \
    --max-instances=10 \
    --cpu=2 \
    --memory=2Gi \
    --no-cpu-throttling \
    --cpu-boost \
    --allow-unauthenticated \
    --quiet

  echo "✅ Backend deployed: https://api.soraipixel.com"
}

deploy_leadgen() {
  echo "🔨 Building leadgen..."
  gcloud builds submit leadgen/ \
    --tag "$REPO/sorapixel-leadgen:$TAG" \
    --region "$REGION" \
    --project "$PROJECT" \
    --quiet

  echo "🚀 Deploying leadgen to Cloud Run..."
  gcloud run deploy sorapixel-leadgen \
    --image "$REPO/sorapixel-leadgen:$TAG" \
    --region "$REGION" \
    --project "$PROJECT" \
    --env-vars-file leadgen/env.yaml \
    --service-account sorapixel-backend@sorapixel-prod.iam.gserviceaccount.com \
    --min-instances=0 \
    --max-instances=3 \
    --cpu=1 \
    --memory=1Gi \
    --allow-unauthenticated \
    --quiet

  echo "✅ LeadGen deployed"
}

deploy_frontend() {
  echo "🔨 Building frontend..."
  gcloud builds submit frontend/ \
    --tag "$REPO/sorapixel-frontend:$TAG" \
    --region "$REGION" \
    --project "$PROJECT" \
    --quiet

  echo "🚀 Deploying frontend to Cloud Run..."
  gcloud run deploy sorapixel-frontend \
    --image "$REPO/sorapixel-frontend:$TAG" \
    --region "$REGION" \
    --project "$PROJECT" \
    --env-vars-file frontend/env.yaml \
    --min-instances=1 \
    --max-instances=10 \
    --cpu-boost \
    --allow-unauthenticated \
    --quiet

  echo "✅ Frontend deployed: https://soraipixel.com"
}

case "${1:-all}" in
  backend)  deploy_backend ;;
  frontend) deploy_frontend ;;
  leadgen)  deploy_leadgen ;;
  all)      deploy_backend && deploy_frontend ;;
  *)        echo "Usage: ./deploy.sh [backend|frontend|leadgen|all]" && exit 1 ;;
esac
