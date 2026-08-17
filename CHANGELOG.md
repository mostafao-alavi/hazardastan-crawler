# Changelog

All notable changes to the Hazardastan Crawler project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0-core-freeze] - 2026-08-16

### Added
- **Cloudflare Workers Architecture**: Pure serverless edge runtime using Hono framework.
- **Cloudflare D1 Database Integration**: Strict 12-table core schema (`hazardastan-d1-1`) with parameterized queries.
- **Cloudflare KV Cache Layer**: Ultra-fast key-value state & configuration store (`hazardastan-cache-kv`).
- **Cloudflare Queues Pipeline**: Asynchronous batch crawl job producer and consumer (`hazardastan-crawl-queue`).
- **Live Extraction Sandbox**: Real-time interactive selector testing, preview, and CSS/DOM validation environment.
- **Source Rule Management Engine**: Dynamic per-source database-driven configuration with rate limiting and cleaning selectors.
- **API Versioning**: Canonical `/api/v1` namespace with comprehensive backward-compatible aliases.
- **Google Sheets Backup Integration**: Durable off-site structured data sync via Google Apps Script Web App.
- **AI Agent Documentation Framework**: Standardized `AGENTS.md` and detailed `docs/` suite.

### Changed
- Migrated all frontend administrative API calls to canonical `/api/v1/*` endpoints.
- Removed legacy and deprecated documentation files.
- Standardized error codes and response envelopes (`{ success, data, error, timestamp }`).
- Refactored health and system info endpoints for edge telemetry.

### Fixed
- KV namespace binding references and fallback handling.
- D1 resource identifiers synchronization in `wrangler.toml`.
- Production Wrangler edge deployment configuration.

---

## [1.0.0] - Baseline Prototype
- Initial RSS feed parsing prototype and local storage schema.
