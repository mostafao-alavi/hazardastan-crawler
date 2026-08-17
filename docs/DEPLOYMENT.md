# Production Deployment Guide

## 1. Prerequisites
- Cloudflare Account with Worker & D1 privileges
- Authenticated Wrangler session (`npx wrangler login` or `CLOUDFLARE_API_TOKEN`)

---

## 2. Step-by-Step Production Deployment

### Step 1: Initialize Remote Database Schema
Execute the 12-table schema on the remote D1 instance:
```bash
npx wrangler d1 execute hazardastan-d1-1 --remote --file=./schema.sql
```

### Step 2: Seed Default Sources
```bash
npx wrangler d1 execute hazardastan-d1-1 --remote --file=./seed.sql
```

### Step 3: Build Assets
```bash
npm run build
```

### Step 4: Deploy Worker to Cloudflare
```bash
npx wrangler deploy
```

---

## 3. Post-Deployment Verification Checklist

1. **Verify Bindings**:
   - `env.DB` connected to `hazardastan-d1-1`
   - `env.CACHE` connected to `hazardastan-cache-kv`
   - `env.CRAWL_QUEUE` connected to `hazardastan-crawl-queue`
   - `env.ENVIRONMENT = "production"`
2. **Health Check Endpoint**:
   ```bash
   curl -s https://crawler.hazardastan.com/health
   # or
   curl -s https://hazardastan-crawler.workers.dev/health
   ```
3. **Trigger Discovery Test**:
   ```bash
   curl -X POST https://crawler.hazardastan.com/api/v1/crawl/trigger
   ```
