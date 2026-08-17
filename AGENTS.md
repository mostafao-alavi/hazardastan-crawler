# Hazardastan Crawler Engineering Context

## Mission
Build a generic Cloudflare-native news crawling and structured content extraction platform.

## Architecture
- **Runtime**: Cloudflare Workers (Hono framework)
- **Database**: Cloudflare D1 (`hazardastan-d1-1`)
- **Cache & Fast State**: Workers KV (`hazardastan-cache-kv`)
- **Async Processing & Queues**: Cloudflare Queues (`hazardastan-crawl-queue`)
- **Frontend / Admin UI**: React + TypeScript (Vite Single Page Application)
- **Stateful Processing**: Durable Objects (planned for Sprint 2)

## Architectural & Engineering Rules
1. **Never introduce external servers** — All backend operations must execute on Cloudflare Serverless Edge runtime.
2. **Never add unnecessary dependencies** — Prefer native standard web APIs (Fetch, Streams, Web Crypto) and lightweight libraries.
3. **All APIs must use `/api/v1`** — Maintain strict API versioning across all endpoints.
4. **All database changes require migrations** — No dynamic schema alterations at runtime; adhere to strict 12-table core schema.
5. **All Cloudflare resources must exist in `wrangler.toml`** — `wrangler.toml` in Git is the single source of truth.
6. **No AI / Translation in Core Crawler** — The MVP crawler focus is 100% on discovery, parsing, cleaning, validation, normalization, and Google Sheets backup.

## Active Cloudflare Bindings
- `env.DB` (D1 Database: `hazardastan-d1-1`, ID: `9cd3ff5a-0051-43c9-88ee-1383375606c6`)
- `env.CACHE` (Workers KV: `hazardastan-cache-kv`, ID: `3aa0fb8cc7784d02ac88c665136976ef`)
- `env.CRAWL_QUEUE` (Cloudflare Queue: `hazardastan-crawl-queue`)
- `env.ENVIRONMENT` (Production variable: `"production"`)

## Forbidden Changes
The following architectural modifications are strictly prohibited:
1. **Never replace Cloudflare services with external servers** — Do not introduce external Node.js, VPS, Docker, or non-Cloudflare cloud infrastructure.
2. **Never add Express runtime to production worker** — The production edge runtime must remain pure Cloudflare Workers (using Hono).
3. **Never store binary images in D1** — D1 must store image metadata only (URL, role, dimensions, alt text, caption).
4. **Never bypass the migration system** — All database structural changes must be defined in `schema.sql` and migration scripts.
5. **Never create undocumented bindings** — All D1, KV, Queue, and Environment bindings must be declared in `wrangler.toml`.
6. **Never change API version without an ADR** — `/api/v1` is the canonical namespace. Version changes require an approved Architectural Decision Record.

## Current Sprint Status
- **Sprint 0.1**: Cloudflare Infrastructure ✅
- **Sprint 1.0**: Source Management & Rule Configuration ✅
- **Sprint 1.5**: Generic Crawl Engine Core, Resume Checkpoints & Failure Recovery ⏳
- **Repository & Documentation Standardization**: 🔄 In Progress
