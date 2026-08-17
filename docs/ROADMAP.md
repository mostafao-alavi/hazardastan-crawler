# Product & Technical Roadmap

## Sprint Tracking & Status

### Phase 1: Foundation & Core Crawler (Current Phase)

- **Sprint 0.1: Cloudflare Edge Infrastructure** `[COMPLETED]`
  - [x] Cloudflare Worker setup with Hono framework
  - [x] Cloudflare D1 integration (`hazardastan-d1-1`)
  - [x] Cloudflare KV cache integration (`hazardastan-cache-kv`)
  - [x] Cloudflare Queue pipeline setup (`hazardastan-crawl-queue`)

- **Sprint 1.0: Source Management & Extraction Sandbox** `[COMPLETED]`
  - [x] Dynamic source CRUD and `source_configs` table
  - [x] Live extraction sandbox with CSS selector testing
  - [x] Article and content block visualizer

- **Sprint 1.5: Crawler Core Freeze & Failure Recovery** `[IN PROGRESS]`
  - [x] Repository and URL Architecture standardization (`/api/v1`)
  - [x] Definitive documentation rebuild & ADR records
  - [ ] Date window execution engine (Continuous / Historical / Backward)
  - [ ] Checkpoint resumption & automatic failure backoff
  - [ ] Google Sheets automated background backup integration

---

### Phase 2: Scale & Stateful Processing (Future Phase)

- **Sprint 2.0: Durable Objects & Distributed Locking**
  - [ ] Durable Objects for distributed crawl lock management
  - [ ] Real-time crawl progress streaming
  - [ ] Centralized rate limiter per domain

---

### Phase 3: AI & Semantic Capabilities (Post-Crawler Stabilization)

- **Sprint 3.0: Workers AI & Classification**
  - [ ] Workers AI for article taxonomy & category classification
  - [ ] Duplicate detection and content quality scoring
  - [ ] Text summarization

- **Sprint 4.0: Vectorize & Semantic Search**
  - [ ] Vector embeddings generation for crawled articles
  - [ ] Similarity search and duplicate grouping
