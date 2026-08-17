# Hazardastan REST API Reference (v1)

## 1. Overview
All API endpoints follow strict versioning under the `/api/v1/` prefix.

- **Base Production URL**: `https://crawler.hazardastan.com/api/v1`
- **Content Type**: `application/json`
- **Standard Response Structure**:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

---

## 2. API Endpoints Map

### Source Management (`/api/v1/sources`)
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/sources` | List all configured news sources with rules & health |
| `POST` | `/api/v1/sources` | Register a new source with extraction configuration |
| `GET` | `/api/v1/sources/:id` | Get details of a single source |
| `PUT` | `/api/v1/sources/:id` | Update source configuration and CSS selectors |
| `DELETE` | `/api/v1/sources/:id` | Remove a source and cascade delete associated records |
| `POST` | `/api/v1/sources/:id/toggle` | Enable or disable automated crawling for a source |

### Live Extraction Sandbox (`/api/v1/extraction`)
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/extraction/test` | Test selectors and cleaning rules on a live URL without saving |

### Crawler Pipeline (`/api/v1/crawl`)
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/crawl/trigger` | Manually trigger a crawl cycle (all or specific source) |
| `GET` | `/api/v1/crawl/status` | Current active crawl jobs, queued items, and queue metrics |
| `POST` | `/api/v1/crawl/test-feed` | Validate an RSS/Atom feed or sitemap URL |

### Articles & Structured Data (`/api/v1/articles`)
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/articles` | List articles with filtering (`source_id`, status, date) |
| `GET` | `/api/v1/articles/:id` | Get full normalized article details |
| `GET` | `/api/v1/articles/:id/blocks` | Get ordered content blocks (`article_blocks`) |
| `GET` | `/api/v1/articles/:id/images` | Get extracted image metadata items (`article_images`) |
| `DELETE` | `/api/v1/articles/:id` | Delete article and related blocks |

### Jobs, Checkpoints & Errors (`/api/v1/jobs`)
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/jobs` | History of crawl jobs (`crawl_jobs`) |
| `GET` | `/api/v1/jobs/:id` | Execution metrics for a specific job |
| `GET` | `/api/v1/jobs/:id/errors` | Detailed error logs (`crawl_errors`) for a job |
| `GET` | `/api/v1/checkpoints` | Stateful date cursors and health status |

### Backup Destinations (`/api/v1/backup`)
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/backup/destinations` | List configured Google Sheets endpoints |
| `POST` | `/api/v1/backup/destinations` | Update Apps Script Web App URL and Sheet name |
| `POST` | `/api/v1/backup/test-connection`| Ping Google Apps Script and measure latency |
| `POST` | `/api/v1/backup/sync-now` | Trigger manual sync of pending articles |
| `GET` | `/api/v1/backup/runs` | View execution history of backup sync runs |

### System & Health (`/api/v1/health`, `/api/v1/stats`)
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Edge health check (D1, KV, Worker timestamp) |
| `GET` | `/api/v1/stats` | Aggregated metrics (articles count, success rate, latency) |
| `POST` | `/api/v1/database/seed` | Seed default sources into D1 |
