# ADR 003: Eight-Stage Generic Crawler Pipeline

## Context
Hardcoding domain scrapers produces brittle codebases that break upon HTML redesigns. Additionally, mixing discovery with parsing within single monolithic functions leads to timeout errors on serverless workers.

## Decision
Enforce a generic, configuration-driven eight-stage ingestion pipeline:
`FETCH -> PARSE -> CLEAN -> EXTRACT -> NORMALIZE -> VALIDATE -> STORE -> BACKUP`

- **Discovery** (finding URLs via RSS/Sitemap) is decoupled from **Extraction** (fetching and parsing full articles) via Cloudflare Queues (`CRAWL_QUEUE`).
- All selectors (CSS/XPath) and DOM sanitization rules are stored in `source_configs` and can be edited live via the admin dashboard.

## Consequences
- Clean separation of concerns.
- Resilient retry semantics via Cloudflare Queues.
- Zero code deployment needed to add new news sources.
