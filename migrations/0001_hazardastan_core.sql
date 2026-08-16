-- ============================================================================
-- Migration: 0001_hazardastan_core.sql
-- Description: Core 12-Table Relational Schema for Hazardastan Crawler Platform
-- ============================================================================

-- 1. جدول منابع خبری
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'rss', -- 'rss', 'atom', 'sitemap', 'html_listing'
  category TEXT NOT NULL DEFAULT 'general',
  language TEXT NOT NULL DEFAULT 'en',
  fetch_interval_min INTEGER NOT NULL DEFAULT 15,
  scrape_limit INTEGER NOT NULL DEFAULT 10,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. جدول قوانین و پیکربندی استخراج اعلامی
CREATE TABLE IF NOT EXISTS source_configs (
  source_id INTEGER PRIMARY KEY,
  discovery_type TEXT NOT NULL DEFAULT 'rss',
  sitemap_url TEXT,
  rss_url TEXT,
  article_url_pattern TEXT,
  request_headers TEXT DEFAULT '{"User-Agent": "HazardastanBot/1.0 (+https://hazardastan.com/bot)"}',
  rate_limit_delay_ms INTEGER DEFAULT 500,
  max_concurrency INTEGER DEFAULT 3,
  timeout_ms INTEGER DEFAULT 8000,
  title_selector TEXT DEFAULT 'h1',
  subtitle_selector TEXT,
  summary_selector TEXT,
  author_selector TEXT,
  published_date_selector TEXT,
  content_selector TEXT NOT NULL DEFAULT 'article',
  tags_selector TEXT,
  featured_image_selector TEXT,
  article_images_selector TEXT DEFAULT 'img',
  remove_selectors TEXT DEFAULT '["script", "style", "iframe", "noscript", ".ads", ".advertisement", ".social-share", ".newsletter-signup"]',
  cleaning_rules TEXT DEFAULT '{"strip_empty_paragraphs": true, "strip_inline_styles": true, "strip_class_attributes": true, "convert_relative_urls_to_absolute": true, "min_content_length": 150, "min_word_count": 30}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

-- 3. جدول چرخه‌های خزش
CREATE TABLE IF NOT EXISTS crawl_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER,
  trigger_type TEXT NOT NULL DEFAULT 'cron', -- 'cron', 'manual'
  mode TEXT NOT NULL DEFAULT 'continuous', -- 'historical', 'continuous', 'backward', 'backward_all'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'partial'
  items_discovered INTEGER DEFAULT 0,
  items_crawled INTEGER DEFAULT 0,
  items_validated INTEGER DEFAULT 0,
  items_rejected INTEGER DEFAULT 0,
  items_saved INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
);

-- 4. جدول چک‌پوینت‌ها برای Resume
CREATE TABLE IF NOT EXISTS crawl_checkpoints (
  source_id INTEGER PRIMARY KEY,
  job_id INTEGER,
  mode TEXT NOT NULL DEFAULT 'continuous',
  start_date_boundary TEXT,
  end_date_boundary TEXT,
  last_scanned_date TEXT,
  oldest_scanned_date TEXT,
  current_page_number INTEGER DEFAULT 1,
  last_etag TEXT,
  last_modified_header TEXT,
  consecutive_errors INTEGER DEFAULT 0,
  health_status TEXT DEFAULT 'healthy',
  is_completed INTEGER DEFAULT 0,
  last_crawled_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES crawl_jobs(id) ON DELETE SET NULL
);

-- 5. جدول کشف و صف‌بندی URLها (Deduplication)
CREATE TABLE IF NOT EXISTS sitemap_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  url_hash TEXT NOT NULL UNIQUE,
  discovered_title TEXT,
  discovered_pub_date TEXT,
  discovery_status TEXT NOT NULL DEFAULT 'discovered', -- 'discovered', 'queued', 'crawled', 'skipped_old', 'skipped_error'
  discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
  crawled_at TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

-- 6. جدول مقالات استانداردشده (Canonical Articles)
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  original_url TEXT NOT NULL UNIQUE,
  url_hash TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  cleaned_content TEXT NOT NULL,
  plain_text TEXT NOT NULL,
  raw_excerpt TEXT,
  author TEXT,
  featured_image TEXT,
  language TEXT DEFAULT 'en',
  word_count INTEGER DEFAULT 0,
  reading_time_min INTEGER DEFAULT 1,
  published_at TEXT NOT NULL,
  crawled_at TEXT NOT NULL DEFAULT (datetime('now')),
  validation_status TEXT NOT NULL DEFAULT 'valid', -- 'valid', 'rejected'
  rejection_reason TEXT,
  sheets_backup_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'synced', 'failed'
  sheets_backup_at TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

-- 7. جدول بلوک‌های ترتیبی محتوا (Content Blocks)
CREATE TABLE IF NOT EXISTS article_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  block_type TEXT NOT NULL, -- 'paragraph', 'heading', 'image', 'quote', 'list'
  content_text TEXT,
  content_html TEXT,
  media_url TEXT,
  media_caption TEXT,
  media_alt TEXT,
  block_meta TEXT, -- JSON for heading level, word count, etc.
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 8. جدول فراداده تصاویر (Metadata Only)
CREATE TABLE IF NOT EXISTS article_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  original_url TEXT NOT NULL,
  alt_text TEXT,
  title TEXT,
  caption TEXT,
  description TEXT,
  width INTEGER,
  height INTEGER,
  position INTEGER NOT NULL DEFAULT 1,
  role TEXT NOT NULL DEFAULT 'content', -- 'featured', 'content', 'advertisement', 'unknown'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 9. جدول برچسب‌ها (Tags)
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- 10. جدول واسط مقاله و برچسب‌ها
CREATE TABLE IF NOT EXISTS article_tags (
  article_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 11. جدول خطاهای مرحله‌ای خزش
CREATE TABLE IF NOT EXISTS crawl_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER,
  source_id INTEGER,
  article_url TEXT,
  stage TEXT NOT NULL, -- 'discovery', 'fetch', 'extract', 'clean', 'validate', 'backup'
  error_type TEXT NOT NULL,
  http_status INTEGER,
  error_message TEXT NOT NULL,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES crawl_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

-- 12. جدول مقاصد پشتیبان‌گیری
CREATE TABLE IF NOT EXISTS backup_destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  destination_type TEXT NOT NULL DEFAULT 'google_sheets',
  endpoint_url TEXT NOT NULL,
  secret_token TEXT,
  sheet_name TEXT DEFAULT 'Articles_Backup',
  auto_backup INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 13. جدول لاگ اجرای پشتیبان‌گیری
CREATE TABLE IF NOT EXISTS backup_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  destination_id INTEGER NOT NULL,
  job_id INTEGER,
  status TEXT NOT NULL, -- 'success', 'failed'
  items_synced INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  response_summary TEXT,
  executed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (destination_id) REFERENCES backup_destinations(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES crawl_jobs(id) ON DELETE SET NULL
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sources_active ON sources(is_active);
CREATE INDEX IF NOT EXISTS idx_sitemap_hash ON sitemap_entries(url_hash);
CREATE INDEX IF NOT EXISTS idx_sitemap_status ON sitemap_entries(discovery_status);
CREATE INDEX IF NOT EXISTS idx_articles_url_hash ON articles(url_hash);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_crawled_at ON articles(crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_backup_status ON articles(sheets_backup_status);
CREATE INDEX IF NOT EXISTS idx_article_blocks_ordered ON article_blocks(article_id, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_article_images_article ON article_images(article_id);
CREATE INDEX IF NOT EXISTS idx_article_images_role ON article_images(role);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_started ON crawl_jobs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_errors_stage ON crawl_errors(stage);
