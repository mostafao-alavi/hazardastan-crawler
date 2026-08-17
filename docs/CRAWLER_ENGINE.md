# Crawler Engine Specification

## 1. Core Principles
The Hazardastan Crawler is a **generic, database-driven engine** capable of ingesting from any news website without hardcoded domain scrapers.

---

## 2. Crawler Pipeline Stages

The ingestion pipeline strictly enforces eight distinct phases:

```
FETCH
  ↓
PARSE
  ↓
CLEAN
  ↓
EXTRACT
  ↓
NORMALIZE
  ↓
VALIDATE
  ↓
STORE
  ↓
BACKUP
```

1. **FETCH**: Retrieves HTML or feed XML with configured timeouts, User-Agent header, and rate-limiting delays.
2. **PARSE**: Converts response body into a traversable DOM (using Cheerio / lightweight parser).
3. **CLEAN**: Strips noise nodes (scripts, styles, ads, modals, social widgets).
4. **EXTRACT**: Queries target selectors (`title_selector`, `content_selector`, `author_selector`, `date_selector`).
5. **NORMALIZE**: Converts relative links to absolute, cleans whitespace, strips trailing tracking params.
6. **VALIDATE**: Enforces minimum word count, valid publication timestamp, non-empty title.
7. **STORE**: Inserts normalized record into D1 `articles`, generates ordered `article_blocks` and `article_images`.
8. **BACKUP**: Dispatches record to Google Sheets via Apps Script integration.

---

## 3. Date Engine & Crawling Windows

The crawler engine supports flexible historical and continuous collection modes:

- **Continuous Monitoring Mode**: Starts from the last known checkpoint cursor and processes new articles.
- **Historical Forward Window**: Crawls from a specified start date until the present.
- **Historical Backward Window**: Crawls backward from current day into archive pages until a target date boundary is satisfied.
- **Discrete Batch Window**: Scans between fixed `[start_date, end_date]` intervals.

Checkpoints are tracked in `crawl_checkpoints` per source to prevent duplicate crawling.

---

## 4. Concurrency & Queue Dispatch

- **Discovery (15-min Cron)** pushes article URLs as discreet tasks to `hazardastan-crawl-queue`.
- **Consumer** receives batches (`max_batch_size: 5`, `max_concurrency: 3`, `max_retries: 3`), avoiding Cloudflare CPU exhaustion.
- **Error Handling**: Non-fatal extraction failures log to `crawl_errors` table with stage and HTTP status.
