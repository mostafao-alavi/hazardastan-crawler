# Database Architecture & Schema Specification

## 1. D1 Database Strategy
Hazardastan uses **Cloudflare D1** (`hazardastan-d1-1`) as its primary relational database.
All entities are strictly modeled without temporary tables or dynamic ad-hoc columns.

---

## 2. 12-Table Entity Relationship Model

| # | Table Name | Purpose | Primary Key / Constraints |
| :--- | :--- | :--- | :--- |
| 1 | `sources` | Root news feeds and target websites | `id` (AUTOINCREMENT), `slug` (UNIQUE) |
| 2 | `source_configs` | CSS/DOM extraction rules, rate limits & headers | `source_id` (FK to sources, CASCADE) |
| 3 | `crawl_jobs` | Execution cycles, timing, and item counts | `id` (AUTOINCREMENT) |
| 4 | `crawl_checkpoints` | Stateful cursors, date windows & health | `source_id` (PRIMARY KEY, FK) |
| 5 | `sitemap_entries` | Discovered URLs & deduplication ledger | `id`, `url_hash` (UNIQUE) |
| 6 | `articles` | Normalized articles & structured metadata | `id`, `original_url` (UNIQUE), `url_hash` (UNIQUE) |
| 7 | `article_blocks` | Sequential content blocks (p, h2, quote, img) | `id`, `article_id` (FK), `order_index` |
| 8 | `article_images` | Image URLs and rich metadata (References only) | `id`, `article_id` (FK), `position` |
| 9 | `tags` | Distinct taxonomical labels | `id`, `slug` (UNIQUE) |
| 10 | `article_tags` | Many-to-Many junction table | `(article_id, tag_id)` (Composite PK) |
| 11 | `crawl_errors` | Fine-grained error observability log | `id`, `stage`, `error_type` |
| 12 | `backup_destinations` | Google Sheets / external webhook configurations | `id` (AUTOINCREMENT) |
| 13 | `backup_runs` | Logs of executed backup sync cycles | `id`, `destination_id` (FK) |

---

## 3. Schema Highlights

### Image Metadata Model (`article_images`)
Images are stored **strictly as references** (no R2 binary storage):
- `url`: Direct or canonical image URL
- `original_url`: Source image src attribute
- `alt_text`: Accessible description
- `title`: Image tooltip/title attribute
- `caption`: Figcaption or enclosing caption text
- `description`: Surrounding descriptive text
- `width` / `height`: Dimensions if present
- `position`: Sequential index in article
- `role`: `'featured'` | `'content'` | `'advertisement'`

### Content Blocks Model (`article_blocks`)
Articles are broken down into sequential, ordered semantic blocks:
- `order_index`: Integer order (1, 2, 3...)
- `block_type`: `'paragraph'` | `'heading'` | `'image'` | `'quote'` | `'list'`
- `content_text`: Clean plain text
- `content_html`: Sanitized semantic HTML
- `media_url` / `media_caption` / `media_alt`: Block media metadata

---

## 4. Migration & Maintenance Commands

```bash
# Execute full schema initialization on remote D1:
npx wrangler d1 execute hazardastan-d1-1 --remote --file=./schema.sql

# Seed initial sources and test records:
npx wrangler d1 execute hazardastan-d1-1 --remote --file=./seed.sql
```
