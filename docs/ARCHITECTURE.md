# Hazardastan System Architecture

## 1. Executive Summary
**Hazardastan** is a generic, high-throughput, serverless news crawling and structured content extraction engine built natively on the Cloudflare global edge network.

The platform is designed to decouple news discovery, article parsing, structural cleaning, normalization, storage, and external backup from downstream consumers (e.g. AI translation, CMS publishing, Telegram channels).

---

## 2. Core Architectural Pillars

```
+-----------------------------------------------------------------------------------+
|                           CLOUDFLARE EDGE NETWORK                                 |
|                                                                                   |
|  +------------------------+      +-------------------+      +------------------+  |
|  | Cron Trigger (15m)     | ---> | Discovery Engine  | ---> | CRAWL_QUEUE      |  |
|  | /api/v1/crawl/trigger  |      | (RSS/Atom/Sitemap)|      | (Cloudflare Queue|  |
|  +------------------------+      +-------------------+      +------------------+  |
|                                                                      |            |
|                                                                      v            |
|  +-----------------------------------------------------------------------------+  |
|  |                           WORKER CONSUMER PIPELINE                          |  |
|  |                                                                             |  |
|  |  FETCH -> PARSE -> CLEAN -> EXTRACT -> NORMALIZE -> VALIDATE -> STORE       |  |
|  +-----------------------------------------------------------------------------+  |
|          |                            |                              |            |
|          v                            v                              v            |
|    +-------------+             +--------------+               +-------------+     |
|    | Workers KV  |             |  D1 SQLite   |               |   Backup    |     |
|    | (Cache/Conf)|             |  (12 Tables) |               | Google Sheet|     |
|    +-------------+             +--------------+               +-------------+     |
+-----------------------------------------------------------------------------------+
```

### Edge-Native Principles
1. **Zero External Servers**: No Node.js VPS, EC2, or Docker containers in production.
2. **Deterministic State via SQLite**: Durable transactions on Cloudflare D1 with foreign key cascades and relational integrity.
3. **Low-Latency Caching**: Rules, rate-limit timers, and checkpoint cursors cached in Workers KV (`CACHE`).
4. **Resilient Asynchrony**: Cloudflare Queues (`CRAWL_QUEUE`) handle concurrency, retries, and backpressure.
5. **Separation of Concerns**: Core crawler strictly isolates extraction from downstream AI translation or publishing.

---

## 3. URL Architecture & Routing

| Role | Standard URL | Target Resource |
| :--- | :--- | :--- |
| **Production API Gateway** | `https://crawler.hazardastan.com` | Cloudflare Worker (`/api/v1/*`) |
| **Admin Operations Dashboard** | `https://admin.hazardastan.com` | Single-Page React Dashboard |
| **Internal Worker Endpoint** | `https://hazardastan-crawler.workers.dev` | Internal verification & health checks |

---

## 4. Pipeline Execution Model

1. **Discovery (Cron / Manual)**:
   - Queries `sources` for active targets (`is_active = 1`).
   - Fetches RSS/Atom/Sitemap, extracts unique URLs, computes SHA-256 hashes (`url_hash`).
   - Inserts candidates into `sitemap_entries` and dispatches messages to `CRAWL_QUEUE`.
2. **Extraction Worker**:
   - Fetches target HTML with custom User-Agent and headers.
   - Cleans unwanted DOM elements (`script`, `style`, `iframe`, `.ads`).
   - Extracts structured title, author, date, body blocks, and image references.
3. **Validation & Normalization**:
   - Computes word count, reading time, and content length thresholds.
   - Validates required fields (`title`, `content_selector`, `published_at`).
4. **Persistence & Backup**:
   - Saves article record, ordered `article_blocks`, and `article_images` in D1.
   - Synchronizes structured payload to Google Sheets Apps Script endpoint.
