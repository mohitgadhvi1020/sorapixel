FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (NEXT_PUBLIC_ vars must be available at build time)
ENV NEXT_PUBLIC_API_URL=https://api.soraipixel.com/api/v1
ENV NEXT_PUBLIC_SUPABASE_URL=https://ynxppssttkicwglxiraw.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHBwc3N0dGtpY3dnbHhpcmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTA0NTAsImV4cCI6MjA4NjgyNjQ1MH0.XAFb4USg6OawTuGo4q3fTwHrICH_8x8XsTRBOSbEzI8
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_SJaqYr3WEHFMmG
ENV NEXT_PUBLIC_SITE_URL=https://soraipixel.com
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=OU9YLJctoWb36QqDvPnQdSlQ7jv9E9rZNTxooVhNfiU
ENV NEXT_PUBLIC_LEADGEN_API_URL=https://sorapixel-leadgen-454450026154.us-central1.run.app/api/v1
ENV NEXT_PUBLIC_META_PIXEL_ID=2025322508392580
ENV NEXT_PUBLIC_META_PIXEL_DEBUG=false
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=G-QDJYKH69WF
ENV NEXT_PUBLIC_GA_DEBUG=false

RUN npm run build

# Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_PUBLIC_SITE_URL=https://soraipixel.com

CMD ["node", "server.js"]
