# Cloudflare Infrastructure & Bindings

## 1. Cloudflare Resource Topology

The entire Hazardastan production stack is provisioned on Cloudflare serverless edge infrastructure using standard Workers bindings.

| Resource Type | Resource Name | Binding Name | Identifier (ID/UUID) |
| :--- | :--- | :--- | :--- |
| **Worker Application** | `hazardastan-crawler` | - | Account: `d40f4bca3e7eba81b2695074e1a32238` |
| **D1 Database** | `hazardastan-d1-1` | `DB` | `9cd3ff5a-0051-43c9-88ee-1383375606c6` |
| **Workers KV** | `hazardastan-cache-kv` | `CACHE` | `3aa0fb8cc7784d02ac88c665136976ef` |
| **Cloudflare Queue** | `hazardastan-crawl-queue` | `CRAWL_QUEUE` | Queue Producer & Consumer |
| **Cron Trigger** | Periodic Crawler | - | `*/15 * * * *` (Every 15 minutes) |

---

## 2. Definitive `wrangler.toml` Specification

The configuration file `wrangler.toml` at repository root is the authoritative **Source of Truth** for Cloudflare bindings:

```toml
name = "hazardastan-crawler"
main = "src/index.ts"
compatibility_date = "2026-07-23"
compatibility_flags = [
  "nodejs_compat"
]

[observability]
enabled = true

[assets]
directory = "./dist"
not_found_handling = "single-page-application"

# Cloudflare D1
[[d1_databases]]
binding = "DB"
database_name = "hazardastan-d1-1"
database_id = "9cd3ff5a-0051-43c9-88ee-1383375606c6"

# Cloudflare KV
[[kv_namespaces]]
binding = "CACHE"
id = "3aa0fb8cc7784d02ac88c665136976ef"

# Cloudflare Queue
[[queues.producers]]
binding = "CRAWL_QUEUE"
queue = "hazardastan-crawl-queue"

[[queues.consumers]]
queue = "hazardastan-crawl-queue"
max_batch_size = 5
max_concurrency = 3
max_retries = 3

# Cron
[triggers]
crons = [
  "*/15 * * * *"
]

[vars]
ENVIRONMENT = "production"
```

---

## 3. Resource Verification Commands

To verify bindings with Cloudflare before deployment:

```bash
# 1. Verify KV Namespace ID
npx wrangler kv namespace list

# 2. Verify D1 Database ID & Name
npx wrangler d1 list

# 3. Generate TypeScript types for bindings
npx wrangler types
```

---

## 4. Free Tier & Edge Limits Consideration
- **CPU Time Limit**: 10ms - 50ms per subrequest. Network streaming and async queue batching are used to stay well within CPU limits.
- **D1 Limits**: SQLite batching (`db.batch()`) is utilized to minimize round-trip transactions.
- **KV Limits**: Cached keys have defined TTLs and are used for reading configuration and checkpoint deduplication.
