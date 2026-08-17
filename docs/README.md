# Hazardastan Documentation Index

Welcome to the comprehensive engineering documentation for the **Hazardastan Crawler** platform — a Cloudflare-native generic news crawling and structured content extraction engine.

---

## 📚 Documentation Catalog

| Document | Description | Target Audience |
| :--- | :--- | :--- |
| [**Architecture**](./ARCHITECTURE.md) | High-level system architecture, edge execution model, and data flow | Architects, Developers, AI Agents |
| [**Cloudflare Infrastructure**](./CLOUDFLARE.md) | Workers, D1, KV, Queues, Cron triggers, and resource bindings | DevOps, Platform Engineers |
| [**Database Specification**](./DATABASE.md) | 12-table D1 SQLite schema, relational entity models, and indexing | Backend Engineers, DBA |
| [**API Reference (v1)**](./API.md) | Standardized `/api/v1/` endpoints, request/response formats, status codes | Frontend, Integrators, QA |
| [**Crawler Engine**](./CRAWLER_ENGINE.md) | Discovery engine (RSS/Atom/Sitemap), date range windows, queue batches | Core Crawler Engineers |
| [**Extraction Engine**](./EXTRACTION_ENGINE.md) | HTML parsing, DOM cleaning, content blocks, image metadata extraction | Parser Developers |
| [**Development Guide**](./DEVELOPMENT.md) | Local environment setup, Vite dev server, SQLite emulation, testing | All Developers |
| [**Deployment Guide**](./DEPLOYMENT.md) | Wrangler CLI deployment, D1 remote execution, KV provisioning | DevOps, Maintainers |
| [**Product Roadmap**](./ROADMAP.md) | Sprint breakdown (Sprint 0.1 to Sprint 4.0), milestones, backlog | Product Owners, Team Leads |
| [**Architecture Decision Records (ADRs)**](./adr/) | Chronological log of core architectural choices and trade-offs | All Engineers & Agents |

---

## 🎯 Architecture Decision Records (ADR)
- [ADR 001: Cloudflare-Native Edge Architecture](./adr/001-cloudflare-native.md)
- [ADR 002: Single-Database D1 Strategy](./adr/002-d1-database-strategy.md)
- [ADR 003: Eight-Stage Crawler Pipeline](./adr/003-crawler-pipeline.md)
- [ADR 004: Block-Based Content & Metadata-Only Image Schema](./adr/004-extraction-schema.md)

---

## 🔍 URL Architecture Standard
- **Production API**: `https://crawler.hazardastan.com`
- **Admin Dashboard**: `https://admin.hazardastan.com`
- **Internal Edge Worker**: `https://hazardastan-crawler.workers.dev` (Verification only)
