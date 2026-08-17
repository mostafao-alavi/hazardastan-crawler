# Hazardastan Crawler

> **Cloudflare-Native Generic News Crawling, Structured Extraction & Normalization Platform**

[![Release](https://img.shields.io/badge/version-2.0.0--core--freeze-blue.svg)](CHANGELOG.md)
[![Runtime](https://img.shields.io/badge/runtime-Cloudflare_Workers-orange.svg)](https://workers.cloudflare.com/)
[![Database](https://img.shields.io/badge/database-Cloudflare_D1-blue.svg)](https://developers.cloudflare.com/d1/)
[![Cache](https://img.shields.io/badge/cache-Cloudflare_KV-green.svg)](https://developers.cloudflare.com/kv/)
[![Queue](https://img.shields.io/badge/queue-Cloudflare_Queues-purple.svg)](https://developers.cloudflare.com/queues/)
[![License](https://img.shields.io/badge/license-Owner_Decision_Required-lightgrey.svg)](LICENSE)

---

## 1. Overview

**Hazardastan Crawler** is a high-throughput, edge-native web crawling and structured content extraction engine designed specifically for modern news and media intelligence operations. Built from the ground up to run exclusively on Cloudflare's serverless edge infrastructure (Workers, D1, KV, and Queues), it delivers resilient crawling, rule-driven DOM parsing, HTML sanitization, and structured article persistence without the operational overhead of external servers or virtual machines.

---

## 2. Cloudflare-Native Architecture

Hazardastan operates entirely inside the Cloudflare global network, utilizing native Cloudflare primitives:

```
[ Scheduled Triggers / Admin API ]
              │
              ▼
    [ Cloudflare Workers (Hono) ]
              │
    ┌─────────┼─────────┬──────────────┐
    ▼         ▼         ▼              ▼
[ Worker KV] [ Cloudflare D1] [ Cloudflare Queue] [ External News Sources ]
(Fast State) (12-Table SQLite) (Batch Pipeline)    (Ingest & Extract)
                                       │
                                       ▼
                            [ Google Sheets Backup ]
                            (Apps Script Web App)
```

- **Serverless Edge Compute**: Cloudflare Workers running the lightweight [Hono](https://hono.dev/) framework.
- **Relational Storage**: Cloudflare D1 distributed SQLite (`hazardastan-d1-1`) storing normalized articles, content blocks, and image metadata.
- **Configuration & State**: Workers KV (`hazardastan-cache-kv`) for low-latency configuration and fast rate-limit tracking.
- **Asynchronous Queue Engine**: Cloudflare Queues (`hazardastan-crawl-queue`) decoupling discovery from CPU-intensive DOM parsing.
- **Zero Binary Storage**: Image metadata only (URLs, roles, dimensions, alt text) is persisted in D1; no binary blobs or R2 buckets are utilized.

---

## 3. Key Features

- ✅ **Generic Source Configuration**: Configurable per-source rules (CSS selectors, regex clean rules, rate limits, headers) stored dynamically in D1.
- ✅ **8-Stage Pipeline**: `FETCH` → `PARSE` → `CLEAN` → `EXTRACT` → `NORMALIZE` → `VALIDATE` → `STORE` → `BACKUP`.
- ✅ **Live Extraction Sandbox**: Real-time interactive UI for testing selectors, visualizing extracted DOM blocks, and previewing image metadata.
- ✅ **Metadata-Only Image Registry**: Extraction and normalization of featured/inline images with captions, dimensions, and order.
- ✅ **Durable Offsite Backup**: Automatic synchronization of structured records to Google Sheets via secure Google Apps Script endpoints.
- ✅ **Strict API Versioning**: All production routes reside under `/api/v1/*` with legacy backward-compatibility fallbacks.
- ✅ **Garbage Collection & Health Monitoring**: Built-in 7-day text pruning to remain well within free-tier storage budgets.

---

## 4. Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Runtime** | Cloudflare Workers | Serverless Edge Execution Environment |
| **API Framework** | Hono v4 | Strict `/api/v1` RESTful Routing & Middleware |
| **Database** | Cloudflare D1 | Distributed Relational Database (12 tables) |
| **Cache / State** | Cloudflare Workers KV | Low-latency state & rule caching |
| **Queue** | Cloudflare Queues | Batch crawl job queue producer & consumer |
| **Frontend** | React 19 + TypeScript | Operational Admin & Sandbox Dashboard |
| **Styling** | Tailwind CSS v4 | Responsive edge dashboard design |
| **DOM Parser** | Cheerio + Turndown | Serverless HTML parsing & block conversion |

---

## 5. Quick Start (Local Development)

### Prerequisites
- Node.js `>= 20.0.0` or Bun
- npm `>= 10.0.0`
- Wrangler CLI (`npm install -g wrangler`)

### Installation & Execution
```bash
# Clone the repository
git clone https://github.com/hazardastan/hazardastan-crawler.git
cd hazardastan-crawler

# Install dependencies
npm install

# Run local development server (port 3000)
npm run dev

# Run TypeScript type verification
npm run lint

# Build production bundle
npm run build
```

---

## 6. Production Deployment

### 1. Apply D1 Migrations
```bash
npx wrangler d1 execute hazardastan-d1-1 --remote --file=./schema.sql
```

### 2. Configure Cloudflare Secrets
```bash
wrangler secret put ADMIN_SECRET
```

### 3. Deploy Worker & Static Assets
```bash
npm run build
npx wrangler deploy
```

---

## 7. AI Coding Agents Guidelines

> *Reference guidelines for AI assistants (Gemini, Claude Code, ChatGPT, Copilot):*

- **Scope Boundary**: Hazardastan Crawler MVP is 100% focused on ingestion, extraction, cleaning, validation, storage, and Google Sheets backup. AI translation, WordPress publishing, and Telegram bots are isolated from the core crawler.
- **Architectural Guardrails**:
  - Never introduce external VPS, Node servers, or Docker containers.
  - Never store binary images in D1 (metadata only).
  - All database schema modifications must reside in `schema.sql` and migrations.
  - Always maintain authoritative bindings in `wrangler.toml`.
  - Always keep strict TypeScript typing and verify with `npm run lint`.
- See [`AGENTS.md`](AGENTS.md) and [`docs/`](docs/) for full architectural constraints.

---

## 8. Roadmap & Sprint Status

- **Sprint 0.1**: Cloudflare Serverless Infrastructure ✅
- **Sprint 1.0**: Source Management & Rule Engine ✅
- **Sprint 1.5**: Generic Crawl Engine Core, Resume Checkpoints & Failure Recovery ⏳
- **Sprint 2.0**: Stateful Crawling with Cloudflare Durable Objects 📅
- **Sprint 3.0**: Vector Search & Semantic Deduplication 📅

---

## 9. Documentation Index

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Cloudflare Bindings Specification](docs/CLOUDFLARE.md)
- [Database Schema & Entities](docs/DATABASE.md)
- [API Reference (/api/v1)](docs/API.md)
- [Crawler Engine 8-Stage Pipeline](docs/CRAWLER_ENGINE.md)
- [Extraction Engine & Schema](docs/EXTRACTION_ENGINE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Security Policy](docs/SECURITY.md)
- [Architecture Decision Records (ADRs)](docs/adr/)
- [Changelog](CHANGELOG.md)
- [Contributing Guidelines](CONTRIBUTING.md)

---

## 10. License

See [`LICENSE`](LICENSE) for licensing status (TODO: Owner decision required).
