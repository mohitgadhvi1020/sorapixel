#!/bin/bash
# Memory-optimized start script for Render (512MB Starter plan)
# - Single worker to minimize memory footprint
# - Limits concurrency to prevent OOM under load
# - Preload disabled to allow lazy imports

exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers 1 \
    --limit-concurrency 10 \
    --limit-max-requests 1000 \
    --timeout-keep-alive 30 \
    --log-level info
