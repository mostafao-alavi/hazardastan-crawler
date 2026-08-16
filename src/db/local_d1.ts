import Database from 'better-sqlite3';

const sqlite = new Database('local_d1.sqlite');

// Initialize 12-table Hazardastan Core Schema
try {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      base_url TEXT NOT NULL,
      feed_url TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'rss',
      category TEXT NOT NULL DEFAULT 'general',
      language TEXT NOT NULL DEFAULT 'en',
      fetch_interval_min INTEGER NOT NULL DEFAULT 15,
      scrape_limit INTEGER NOT NULL DEFAULT 10,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

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

    CREATE TABLE IF NOT EXISTS crawl_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER,
      trigger_type TEXT NOT NULL DEFAULT 'cron',
      mode TEXT NOT NULL DEFAULT 'continuous',
      status TEXT NOT NULL DEFAULT 'running',
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

    CREATE TABLE IF NOT EXISTS sitemap_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      url_hash TEXT NOT NULL UNIQUE,
      discovered_title TEXT,
      discovered_pub_date TEXT,
      discovery_status TEXT NOT NULL DEFAULT 'discovered',
      discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
      crawled_at TEXT,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    );

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
      validation_status TEXT NOT NULL DEFAULT 'valid',
      rejection_reason TEXT,
      sheets_backup_status TEXT NOT NULL DEFAULT 'pending',
      sheets_backup_at TEXT,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS article_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      block_type TEXT NOT NULL,
      content_text TEXT,
      content_html TEXT,
      media_url TEXT,
      media_caption TEXT,
      media_alt TEXT,
      block_meta TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

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
      role TEXT NOT NULL DEFAULT 'content',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS article_tags (
      article_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (article_id, tag_id),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS crawl_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER,
      source_id INTEGER,
      article_url TEXT,
      stage TEXT NOT NULL,
      error_type TEXT NOT NULL,
      http_status INTEGER,
      error_message TEXT NOT NULL,
      occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES crawl_jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    );

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

    CREATE TABLE IF NOT EXISTS backup_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      destination_id INTEGER NOT NULL,
      job_id INTEGER,
      status TEXT NOT NULL,
      items_synced INTEGER DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      response_summary TEXT,
      executed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (destination_id) REFERENCES backup_destinations(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES crawl_jobs(id) ON DELETE SET NULL
    );

    -- Seed initial source & config if empty
    INSERT OR IGNORE INTO sources (id, name, slug, base_url, feed_url, source_type, category, language, is_active, scrape_limit)
    VALUES (1, 'Cointelegraph', 'cointelegraph', 'https://cointelegraph.com', 'https://cointelegraph.com/rss', 'rss', 'crypto', 'en', 1, 10);

    INSERT OR IGNORE INTO source_configs (source_id, discovery_type, rss_url, sitemap_url, article_url_pattern, title_selector, content_selector, featured_image_selector)
    VALUES (1, 'rss', 'https://cointelegraph.com/rss', 'https://cointelegraph.com/sitemap.xml', '^https://cointelegraph\\.com/news/.+', 'h1.post-title, .article__title', 'article, .post-content', 'meta[property="og:image"]');

    INSERT OR IGNORE INTO backup_destinations (id, name, destination_type, endpoint_url, sheet_name, is_active)
    VALUES (1, 'Google Sheets Primary', 'google_sheets', '', 'Articles_Backup', 1);
  `);
} catch (e: any) {
  console.warn('[Local D1] SQLite initialization notice:', e.message);
}

export const mockD1 = {
  prepare: (query: string) => {
    return {
      bind: (...params: any[]) => {
        return {
          all: async <T = any>() => {
            const stmt = sqlite.prepare(query);
            const results = stmt.all(...params) as T[];
            return { success: true, results };
          },
          run: async () => {
            const stmt = sqlite.prepare(query);
            const info = stmt.run(...params);
            return {
              success: true,
              meta: { changes: info.changes, last_row_id: info.lastInsertRowid }
            };
          },
          first: async <T = any>() => {
            const stmt = sqlite.prepare(query);
            const result = stmt.get(...params) as T | undefined;
            return result || null;
          }
        };
      },
      all: async <T = any>() => {
        const stmt = sqlite.prepare(query);
        const results = stmt.all() as T[];
        return { success: true, results };
      },
      run: async () => {
        const stmt = sqlite.prepare(query);
        const info = stmt.run();
        return {
          success: true,
          meta: { changes: info.changes, last_row_id: info.lastInsertRowid }
        };
      },
      first: async <T = any>() => {
        const stmt = sqlite.prepare(query);
        const result = stmt.get() as T | undefined;
        return result || null;
      }
    };
  },
  batch: async (statements: any[]) => {
    const results = [];
    sqlite.exec('BEGIN');
    try {
      for (const stmt of statements) {
         results.push(await stmt.run());
      }
      sqlite.exec('COMMIT');
      return results;
    } catch (e) {
      sqlite.exec('ROLLBACK');
      throw e;
    }
  },
  exec: async (query: string) => {
    sqlite.exec(query);
    return { success: true };
  }
};

const localKvMap = new Map<string, string>();
export const mockKV = {
  get: async (key: string) => localKvMap.get(key) || null,
  put: async (key: string, value: string) => { localKvMap.set(key, String(value)); },
  delete: async (key: string) => { localKvMap.delete(key); },
  list: async () => ({ keys: Array.from(localKvMap.keys()).map(k => ({ name: k })), list_complete: true }),
};
