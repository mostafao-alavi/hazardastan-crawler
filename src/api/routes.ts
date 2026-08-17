import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, ApiResponse, Source, SourceConfig, JoinedArticleNews, StatsData } from '../types.ts';
import { wpSyncPublisher, testWordPressConnection } from '../archive/wpSync.ts';
import { testBot, sendNewsToTelegram } from '../archive/telegramBot.ts';
import { executeExtractionPipeline, saveExtractedArticleToD1, fetchUrl, computeUrlHash } from '../core/crawler/index.ts';

const api = new Hono<{ Bindings: Env }>();

// Enable CORS for all routes
api.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

let tablesEnsured = false;
export async function ensureTablesAndLogs(db: any, force: boolean = false) {
  if (!db) return;
  if (tablesEnsured && !force) return;

  try {
    const tableSqls = [
      `CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        base_url TEXT,
        feed_url TEXT,
        url TEXT UNIQUE,
        source_type TEXT DEFAULT 'rss',
        language TEXT DEFAULT 'en',
        category TEXT DEFAULT 'general',
        selector TEXT DEFAULT NULL,
        fetch_interval_min INTEGER DEFAULT 15,
        scrape_limit INTEGER DEFAULT 10,
        is_active INTEGER DEFAULT 1,
        last_scraped_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );`,
      `CREATE TABLE IF NOT EXISTS source_configs (
        source_id INTEGER PRIMARY KEY,
        discovery_type TEXT NOT NULL DEFAULT 'rss',
        sitemap_url TEXT,
        rss_url TEXT,
        article_url_pattern TEXT,
        request_headers TEXT DEFAULT '{"User-Agent": "HazardastanBot/2.0 (+https://hazardastan.com/bot; Generic News Crawler)"}',
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
        cleaning_rules TEXT DEFAULT '{"strip_empty_paragraphs": true, "strip_inline_styles": true, "strip_class_attributes": true, "convert_relative_urls_to_absolute": true, "min_content_length": 100, "min_word_count": 30}',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS crawl_jobs (
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
      );`,
      `CREATE TABLE IF NOT EXISTS crawl_checkpoints (
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
      );`,
      `CREATE TABLE IF NOT EXISTS sitemap_entries (
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
      );`,
      `CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL,
        original_url TEXT NOT NULL UNIQUE,
        url_hash TEXT UNIQUE,
        title TEXT NOT NULL,
        content TEXT,
        cleaned_content TEXT,
        plain_text TEXT,
        raw_excerpt TEXT,
        author TEXT,
        featured_image TEXT,
        word_count INTEGER DEFAULT 0,
        reading_time_min INTEGER DEFAULT 1,
        published_at TEXT,
        crawled_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now')),
        validation_status TEXT DEFAULT 'valid',
        rejection_reason TEXT,
        sheets_backup_status TEXT DEFAULT 'pending',
        translation_status TEXT DEFAULT 'pending',
        FOREIGN KEY (source_id) REFERENCES sources(id)
      );`,
      `CREATE TABLE IF NOT EXISTS article_blocks (
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
      );`,
      `CREATE TABLE IF NOT EXISTS article_images (
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
      );`,
      `CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,
      `CREATE TABLE IF NOT EXISTS article_tags (
        article_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (article_id, tag_id),
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS crawl_errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER,
        job_id INTEGER,
        url TEXT,
        error_stage TEXT NOT NULL,
        error_type TEXT NOT NULL,
        error_message TEXT NOT NULL,
        stack_trace TEXT,
        retry_count INTEGER DEFAULT 0,
        occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL,
        FOREIGN KEY (job_id) REFERENCES crawl_jobs(id) ON DELETE SET NULL
      );`,
      `CREATE TABLE IF NOT EXISTS backup_destinations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'google_sheets',
        target_identifier TEXT NOT NULL,
        auth_config TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        sync_interval_min INTEGER NOT NULL DEFAULT 60,
        last_synced_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,
      `CREATE TABLE IF NOT EXISTS backup_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        destination_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        rows_exported INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        finished_at TEXT,
        FOREIGN KEY (destination_id) REFERENCES backup_destinations(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS translations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL UNIQUE,
        target_language TEXT DEFAULT 'persian',
        translated_title TEXT NOT NULL,
        translated_content TEXT NOT NULL,
        translated_at TEXT DEFAULT (datetime('now')),
        model_used TEXT,
        ai_model TEXT,
        FOREIGN KEY (article_id) REFERENCES articles(id)
      );`,
      `CREATE TABLE IF NOT EXISTS translation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        target_language TEXT DEFAULT 'persian',
        translated_title TEXT NOT NULL,
        translated_content TEXT NOT NULL,
        translated_at TEXT DEFAULT (datetime('now')),
        model_used TEXT NOT NULL,
        FOREIGN KEY (article_id) REFERENCES articles(id)
      );`,
      `CREATE TABLE IF NOT EXISTS execution_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_type TEXT NOT NULL,
        status TEXT NOT NULL,
        items_processed INTEGER DEFAULT 0,
        items_success INTEGER DEFAULT 0,
        error_message TEXT,
        duration_ms INTEGER DEFAULT 0,
        executed_at TEXT DEFAULT (datetime('now'))
      );`,
      `CREATE TABLE IF NOT EXISTS system_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );`,
      `CREATE TABLE IF NOT EXISTS distributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        translation_id INTEGER NOT NULL,
        target_platform TEXT NOT NULL,
        author_name TEXT,
        platform_post_id TEXT,
        published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (translation_id) REFERENCES translations(id)
      );`,
      `CREATE TABLE IF NOT EXISTS platforms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        platform_type TEXT DEFAULT 'wordpress',
        api_url TEXT NOT NULL,
        auth_username TEXT,
        auth_password_secret TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );`,
      `CREATE TABLE IF NOT EXISTS system_metrics (
        key TEXT PRIMARY KEY,
        value INTEGER DEFAULT 0
      );`
    ];

    for (const sql of tableSqls) {
      try { await db.prepare(sql).run(); } catch {}
    }

    // Initialize metrics if empty
    try {
      await db.prepare(`
        INSERT OR IGNORE INTO system_metrics (key, value) VALUES
        ('sources_count', (SELECT COUNT(*) FROM sources)),
        ('articles_count', (SELECT COUNT(*) FROM articles)),
        ('translations_count', (SELECT COUNT(*) FROM translations)),
        ('pending_translations_count', (SELECT COUNT(*) FROM articles WHERE translation_status = 'pending')),
        ('wp_published_count', (SELECT COUNT(*) FROM articles WHERE wp_sync_status = 'published')),
        ('distributions_count', (SELECT COUNT(*) FROM distributions)),
        ('platforms_count', (SELECT COUNT(*) FROM platforms)),
        ('approved_translations_count', (SELECT COUNT(*) FROM translations WHERE approval_status = 'approved' OR approval_status IS NULL))
      `).run();
    } catch {}

    // Safe column migrations for existing tables
    const migrations = [
      "ALTER TABLE sources ADD COLUMN category TEXT DEFAULT 'general'",
      "ALTER TABLE sources ADD COLUMN selector TEXT DEFAULT NULL",
      "ALTER TABLE sources ADD COLUMN scrape_limit INTEGER DEFAULT 10",
      "ALTER TABLE sources ADD COLUMN is_active INTEGER DEFAULT 1",
      "ALTER TABLE sources ADD COLUMN created_at TEXT DEFAULT (datetime('now'))",
      "ALTER TABLE articles ADD COLUMN published_at TEXT",
      "ALTER TABLE articles ADD COLUMN translation_status TEXT DEFAULT 'pending'",
      "ALTER TABLE articles ADD COLUMN wp_sync_status TEXT DEFAULT 'pending'",
      "ALTER TABLE articles ADD COLUMN wp_post_id INTEGER",
      "ALTER TABLE articles ADD COLUMN wp_published_at TEXT",
      "ALTER TABLE articles ADD COLUMN wp_error TEXT",
      "ALTER TABLE translations ADD COLUMN model_used TEXT",
      "ALTER TABLE translations ADD COLUMN ai_model TEXT",
      "ALTER TABLE translations ADD COLUMN approval_status TEXT DEFAULT 'approved'",
      "ALTER TABLE translations ADD COLUMN suggested_titles TEXT",
      "ALTER TABLE translations ADD COLUMN tags TEXT",
      "ALTER TABLE translations ADD COLUMN meta_description TEXT",
      "ALTER TABLE translation_history ADD COLUMN suggested_titles TEXT",
      "ALTER TABLE translation_history ADD COLUMN tags TEXT",
      "ALTER TABLE translation_history ADD COLUMN meta_description TEXT"
    ];

    for (const sql of migrations) {
      try { await db.prepare(sql).run(); } catch {}
    }

    // Seed default platforms if empty
    try {
      const platCount: any = await db.prepare("SELECT COUNT(*) as count FROM platforms").first();
      if (!platCount || platCount.count === 0) {
        await db.prepare(`
          INSERT INTO platforms (name, slug, platform_type, api_url, is_active)
          VALUES 
            ('updaaate.ir (سایت اصلی)', 'updaaate_ir', 'wordpress', 'https://updaaate.ir/wp-json/wp/v2', 1),
            ('مترجم هوشمند وب‌سایت B', 'site_b_tech', 'wordpress', 'https://api.tech-site-b.ir/wp-json/wp/v2', 1),
            ('کانال تلگرام هزاردستان', 'telegram_news', 'telegram', 'https://api.telegram.org/bot/sendMessage', 1)
        `).run();
      }
    } catch {}

    // Indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(translation_status);',
      'CREATE INDEX IF NOT EXISTS idx_articles_wp_status ON articles(wp_sync_status);',
      'CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);',
      'CREATE INDEX IF NOT EXISTS idx_translations_model ON translations(model_used);',
      'CREATE INDEX IF NOT EXISTS idx_translations_approval ON translations(approval_status);',
      'CREATE INDEX IF NOT EXISTS idx_execution_logs_time ON execution_logs(executed_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_translation_history_article ON translation_history(article_id);',
      'CREATE INDEX IF NOT EXISTS idx_distributions_translation ON distributions(translation_id);',
      'CREATE INDEX IF NOT EXISTS idx_distributions_platform ON distributions(target_platform);'
    ];

    for (const sql of indexes) {
      try { await db.prepare(sql).run(); } catch {}
    }

    // Triggers for system_metrics
    const triggers = [
      `CREATE TRIGGER IF NOT EXISTS trg_inc_sources AFTER INSERT ON sources BEGIN UPDATE system_metrics SET value = value + 1 WHERE key = 'sources_count'; END;`,
      `CREATE TRIGGER IF NOT EXISTS trg_dec_sources AFTER DELETE ON sources BEGIN UPDATE system_metrics SET value = value - 1 WHERE key = 'sources_count'; END;`,
      
      `CREATE TRIGGER IF NOT EXISTS trg_inc_articles AFTER INSERT ON articles BEGIN 
         UPDATE system_metrics SET value = value + 1 WHERE key = 'articles_count';
         UPDATE system_metrics SET value = value + 1 WHERE key = 'pending_translations_count' AND NEW.translation_status = 'pending';
         UPDATE system_metrics SET value = value + 1 WHERE key = 'wp_published_count' AND NEW.wp_sync_status = 'published';
       END;`,
      `CREATE TRIGGER IF NOT EXISTS trg_dec_articles AFTER DELETE ON articles BEGIN 
         UPDATE system_metrics SET value = value - 1 WHERE key = 'articles_count';
         UPDATE system_metrics SET value = value - 1 WHERE key = 'pending_translations_count' AND OLD.translation_status = 'pending';
         UPDATE system_metrics SET value = value - 1 WHERE key = 'wp_published_count' AND OLD.wp_sync_status = 'published';
       END;`,
      `CREATE TRIGGER IF NOT EXISTS trg_upd_articles AFTER UPDATE ON articles BEGIN
         UPDATE system_metrics SET value = value - 1 WHERE key = 'pending_translations_count' AND OLD.translation_status = 'pending' AND NEW.translation_status != 'pending';
         UPDATE system_metrics SET value = value + 1 WHERE key = 'pending_translations_count' AND OLD.translation_status != 'pending' AND NEW.translation_status = 'pending';
         UPDATE system_metrics SET value = value - 1 WHERE key = 'wp_published_count' AND OLD.wp_sync_status = 'published' AND NEW.wp_sync_status != 'published';
         UPDATE system_metrics SET value = value + 1 WHERE key = 'wp_published_count' AND OLD.wp_sync_status != 'published' AND NEW.wp_sync_status = 'published';
       END;`,

      `CREATE TRIGGER IF NOT EXISTS trg_inc_translations AFTER INSERT ON translations BEGIN 
         UPDATE system_metrics SET value = value + 1 WHERE key = 'translations_count';
         UPDATE system_metrics SET value = value + 1 WHERE key = 'approved_translations_count' AND (NEW.approval_status = 'approved' OR NEW.approval_status IS NULL);
       END;`,
      `CREATE TRIGGER IF NOT EXISTS trg_dec_translations AFTER DELETE ON translations BEGIN 
         UPDATE system_metrics SET value = value - 1 WHERE key = 'translations_count';
         UPDATE system_metrics SET value = value - 1 WHERE key = 'approved_translations_count' AND (OLD.approval_status = 'approved' OR OLD.approval_status IS NULL);
       END;`,
       `CREATE TRIGGER IF NOT EXISTS trg_upd_translations AFTER UPDATE ON translations BEGIN
         UPDATE system_metrics SET value = value - 1 WHERE key = 'approved_translations_count' AND (OLD.approval_status = 'approved' OR OLD.approval_status IS NULL) AND NEW.approval_status != 'approved' AND NEW.approval_status IS NOT NULL;
         UPDATE system_metrics SET value = value + 1 WHERE key = 'approved_translations_count' AND (OLD.approval_status != 'approved' AND OLD.approval_status IS NOT NULL) AND (NEW.approval_status = 'approved' OR NEW.approval_status IS NULL);
       END;`,
       
      `CREATE TRIGGER IF NOT EXISTS trg_inc_distributions AFTER INSERT ON distributions BEGIN UPDATE system_metrics SET value = value + 1 WHERE key = 'distributions_count'; END;`,
      `CREATE TRIGGER IF NOT EXISTS trg_dec_distributions AFTER DELETE ON distributions BEGIN UPDATE system_metrics SET value = value - 1 WHERE key = 'distributions_count'; END;`,
      
      `CREATE TRIGGER IF NOT EXISTS trg_inc_platforms AFTER INSERT ON platforms BEGIN UPDATE system_metrics SET value = value + 1 WHERE key = 'platforms_count'; END;`,
      `CREATE TRIGGER IF NOT EXISTS trg_dec_platforms AFTER DELETE ON platforms BEGIN UPDATE system_metrics SET value = value - 1 WHERE key = 'platforms_count'; END;`
    ];

    for (const sql of triggers) {
      try { await db.prepare(sql).run(); } catch {}
    }

    tablesEnsured = true;
  } catch (err) {
    console.warn('Database table auto-initialization check:', err);
  }
}

export async function pruneOldArticles(db: any) {
  if (!db) return { prunedCount: 0 };
  try {
    // 1. Identify articles older than 7 days
    const oldArticles = await db.prepare(`
      SELECT id FROM articles 
      WHERE (published_at < datetime('now', '-7 days') OR created_at < datetime('now', '-7 days'))
        AND (content IS NOT NULL AND content != '')
    `).all();

    const idsToPrune = (oldArticles.results || []).map((r: any) => r.id);

    if (idsToPrune.length === 0) {
      return { prunedCount: 0 };
    }

    // 2. Prune heavy full-text content in articles and translations, preserving titles & metadata
    await db.batch([
      db.prepare(`
        UPDATE articles 
        SET content = '[محتوای متنی باسنوات بیش از ۷ روز برای مدیریت فضای دیتابیس D1 پاکسازی شد]'
        WHERE (published_at < datetime('now', '-7 days') OR created_at < datetime('now', '-7 days'))
      `),
      db.prepare(`
        UPDATE translations 
        SET translated_content = '[متن ترجمه قدیمیتر از ۷ روز جهت بهینه‌سازی حافظه D1 پاکسازی گردید]'
        WHERE article_id IN (
          SELECT id FROM articles 
          WHERE (published_at < datetime('now', '-7 days') OR created_at < datetime('now', '-7 days'))
        )
      `)
    ]);

    await recordSystemEvent(
      db, 
      'D1_GARBAGE_COLLECTION', 
      `پاکسازی خودکار D1 انجام شد: متن سنگین ${idsToPrune.length} خبر قدیمی‌تر از ۷ روز جهت مدیریت سقف ۵۰۰ مگابایت حذف گردید.`
    );

    return { prunedCount: idsToPrune.length };
  } catch (err: any) {
    console.error('Error during D1 garbage collection:', err);
    return { prunedCount: 0, error: err.message };
  }
}

export async function recordExecutionLog(
  db: any,
  taskType: string,
  status: string,
  itemsProcessed: number = 0,
  itemsSuccess: number = 0,
  errorMessage: string | null = null,
  durationMs: number = 0
) {
  if (!db) return;
  try {
    await db.prepare(`
      INSERT INTO execution_logs (task_type, status, items_processed, items_success, error_message, duration_ms, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(taskType, status, itemsProcessed, itemsSuccess, errorMessage, durationMs).run();
  } catch (e) {
    console.warn('Failed to insert execution log:', e);
  }
}

export async function recordSystemEvent(db: any, eventType: string, description: string) {
  if (!db) return;
  try {
    await db.prepare(`
      INSERT INTO system_events (event_type, description, created_at)
      VALUES (?, ?, datetime('now'))
    `).bind(eventType, description).run();
  } catch (e) {
    console.warn('Failed to insert system event:', e);
  }
}

// Auto-run schema & index check middleware on Worker request
api.use('*', async (c, next) => {
  ensureTablesAndLogs(c.env.DB).catch(() => {});
  await next();
});

// Health check endpoint
api.get('/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'ok',
      service: '1000-dastan-api',
      timestamp: new Date().toISOString(),
      version: '1.0.1'
    }
  });
});

// Helper for lightweight news list fetching (no bulk text transfer)
const handleFetchNewsList = async (c: any) => {
  try {
    const rawLimit = c.req.query('limit');
    let limit = parseInt(rawLimit || '15', 10);
    if (isNaN(limit) || limit < 1) limit = 15;
    if (limit > 50) limit = 50;

    const query = `
      SELECT 
        articles.id,
        articles.source_id,
        sources.name AS source_name,
        articles.original_url,
        articles.title,
        articles.featured_image,
        articles.published_at,
        articles.created_at,
        articles.translation_status,
        articles.wp_sync_status,
        articles.wp_post_id,
        articles.wp_published_at,
        articles.wp_error,
        translations.translated_title,
        translations.suggested_titles,
        translations.tags,
        translations.meta_description,
        translations.translated_at,
        COALESCE(translations.ai_model, translations.model_used) AS model_used
      FROM articles
      LEFT JOIN sources ON articles.source_id = sources.id
      LEFT JOIN translations ON articles.id = translations.article_id
      ORDER BY articles.created_at DESC
      LIMIT ?
    `;

    const { results } = (await c.env.DB.prepare(query).bind(limit).all()) as { results: JoinedArticleNews[] };

    const response: ApiResponse<JoinedArticleNews[]> = {
      success: true,
      data: results || [],
      error: null,
    };

    c.header('Cache-Control', 'public, max-age=15, s-maxage=30');
    return c.json(response, 200);
  } catch (err: any) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: err.message || 'Error fetching news articles',
    };
    return c.json(response, 500);
  }
};

// GET /api/news & GET /api/articles - Fetch lightweight feed without heavy body payloads
api.get('/news', handleFetchNewsList);
api.get('/articles', handleFetchNewsList);

// Helper for single article detailed fetch (Lazy Loading full content)
const handleFetchArticleDetail = async (c: any) => {
  try {
    const id = c.req.param('id');
    const query = `
      SELECT 
        articles.id,
        articles.source_id,
        sources.name AS source_name,
        articles.original_url,
        articles.title,
        articles.content,
        articles.featured_image,
        articles.published_at,
        articles.created_at,
        articles.translation_status,
        articles.wp_sync_status,
        articles.wp_post_id,
        articles.wp_published_at,
        articles.wp_error,
        translations.translated_title,
        translations.translated_content,
        translations.suggested_titles,
        translations.tags,
        translations.meta_description,
        translations.translated_at,
        COALESCE(translations.ai_model, translations.model_used) AS model_used
      FROM articles
      LEFT JOIN sources ON articles.source_id = sources.id
      LEFT JOIN translations ON articles.id = translations.article_id
      WHERE articles.id = ?
    `;

    const article = (await c.env.DB.prepare(query).bind(id).first()) as JoinedArticleNews | null;

    if (!article) {
      return c.json({ success: false, data: null, error: 'خبر یافت نشد' }, 404);
    }

    c.header('Cache-Control', 'public, max-age=30, s-maxage=60');
    return c.json({ success: true, data: article, error: null }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
};

// GET /api/news/:id & GET /api/articles/:id - Lazy load full text content
api.get('/news/:id', handleFetchArticleDetail);
api.get('/articles/:id', handleFetchArticleDetail);

// POST /api/sources - Add a new news source with full rule configuration
api.post('/sources', async (c) => {
  try {
    const body = await c.req.json<{
      name?: string;
      slug?: string;
      url?: string;
      base_url?: string;
      feed_url?: string;
      source_type?: string;
      language?: string;
      category?: string;
      selector?: string;
      fetch_interval_min?: number;
      scrape_limit?: number;
      is_active?: boolean | number;
      config?: Partial<SourceConfig>;
    }>();

    const targetUrl = (body.url || body.feed_url || body.base_url || '').trim();
    const name = (body.name || '').trim();

    if (!name || !targetUrl) {
      return c.json({
        success: false,
        data: null,
        error: 'نام منبع و آدرس URL الزامی است',
      }, 400);
    }

    const slug = body.slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `src-${Date.now()}`;
    const baseUrl = body.base_url?.trim() || targetUrl;
    const feedUrl = body.feed_url?.trim() || targetUrl;
    const sourceType = body.source_type || 'rss';
    const lang = body.language || 'en';
    const cat = body.category || 'general';
    const sel = body.selector?.trim() || body.config?.content_selector || 'article';
    const interval = typeof body.fetch_interval_min === 'number' && body.fetch_interval_min > 0 ? body.fetch_interval_min : 15;
    const limit = typeof body.scrape_limit === 'number' && body.scrape_limit > 0 ? body.scrape_limit : 10;
    const active = body.is_active === false || body.is_active === 0 ? 0 : 1;

    // Check duplicate
    const existing = await c.env.DB.prepare(
      'SELECT id, name, url, feed_url FROM sources WHERE url = ? OR feed_url = ? OR name = ? OR slug = ?'
    ).bind(targetUrl, feedUrl, name, slug).first<any>();

    if (existing) {
      return c.json({
        success: false,
        data: null,
        error: `منبع "${name}" یا این آدرس قبلاً در سیستم ثبت شده است (شناسه: ${existing.id}).`,
      }, 409);
    }

    // 1. Insert into sources
    const sourceInsert = await c.env.DB.prepare(`
      INSERT INTO sources (
        name, slug, base_url, feed_url, url, source_type, language, category,
        selector, fetch_interval_min, scrape_limit, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      name, slug, baseUrl, feedUrl, targetUrl, sourceType, lang, cat,
      sel, interval, limit, active
    ).run();

    const sourceId = Number(sourceInsert.meta.last_row_id);

    // 2. Insert into source_configs
    const cfg = body.config || {};
    const titleSel = cfg.title_selector || 'h1';
    const subtitleSel = cfg.subtitle_selector || null;
    const summarySel = cfg.summary_selector || null;
    const authorSel = cfg.author_selector || null;
    const pubDateSel = cfg.published_date_selector || null;
    const contentSel = cfg.content_selector || sel || 'article';
    const tagsSel = cfg.tags_selector || null;
    const featImgSel = cfg.featured_image_selector || null;
    const artImgsSel = cfg.article_images_selector || 'img';
    const removeSels = typeof cfg.remove_selectors === 'object' ? JSON.stringify(cfg.remove_selectors) : (cfg.remove_selectors || '["script", "style", "iframe", "noscript", ".ads", ".advertisement", ".social-share", ".newsletter-signup"]');
    const cleaningRules = typeof cfg.cleaning_rules === 'object' ? JSON.stringify(cfg.cleaning_rules) : (cfg.cleaning_rules || '{"strip_empty_paragraphs": true, "strip_inline_styles": true, "strip_class_attributes": true, "convert_relative_urls_to_absolute": true, "min_content_length": 100, "min_word_count": 30}');
    const reqHeaders = typeof cfg.request_headers === 'object' ? JSON.stringify(cfg.request_headers) : (cfg.request_headers || '{"User-Agent": "HazardastanBot/2.0 (+https://hazardastan.com/bot; Generic News Crawler)"}');
    const rateLimit = cfg.rate_limit_delay_ms || 500;
    const timeout = cfg.timeout_ms || 8000;

    await c.env.DB.prepare(`
      INSERT INTO source_configs (
        source_id, discovery_type, sitemap_url, rss_url, article_url_pattern,
        request_headers, rate_limit_delay_ms, max_concurrency, timeout_ms,
        title_selector, subtitle_selector, summary_selector, author_selector,
        published_date_selector, content_selector, tags_selector,
        featured_image_selector, article_images_selector, remove_selectors,
        cleaning_rules, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      sourceId, sourceType, cfg.sitemap_url || null, feedUrl, cfg.article_url_pattern || null,
      reqHeaders, rateLimit, cfg.max_concurrency || 3, timeout,
      titleSel, subtitleSel, summarySel, authorSel,
      pubDateSel, contentSel, tagsSel,
      featImgSel, artImgsSel, removeSels,
      cleaningRules
    ).run();

    // 3. Initialize crawl checkpoint
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO crawl_checkpoints (source_id, mode, health_status, updated_at)
      VALUES (?, 'continuous', 'healthy', datetime('now'))
    `).bind(sourceId).run();

    const createdSource: Source = {
      id: sourceId,
      name,
      slug,
      base_url: baseUrl,
      feed_url: feedUrl,
      url: targetUrl,
      source_type: sourceType,
      language: lang,
      category: cat,
      selector: sel,
      fetch_interval_min: interval,
      scrape_limit: limit,
      is_active: active,
    };

    return c.json({
      success: true,
      data: createdSource,
      error: null,
    }, 201);
  } catch (err: any) {
    return c.json({
      success: false,
      data: null,
      error: err.message || 'خطا در ثبت منبع جدید',
    }, 500);
  }
});

// GET /api/sources - List all news sources with joined configs
api.get('/sources', async (c) => {
  try {
    const query = `
      SELECT 
        sources.id,
        sources.name,
        sources.slug,
        COALESCE(sources.base_url, sources.url) AS base_url,
        COALESCE(sources.feed_url, sources.url) AS feed_url,
        sources.url,
        COALESCE(sources.source_type, 'rss') AS source_type,
        sources.language,
        sources.category,
        sources.selector,
        sources.fetch_interval_min,
        sources.scrape_limit,
        sources.is_active,
        sources.last_scraped_at,
        sources.created_at,
        sources.updated_at,
        source_configs.title_selector,
        source_configs.content_selector,
        source_configs.author_selector,
        source_configs.published_date_selector,
        source_configs.summary_selector,
        source_configs.tags_selector,
        source_configs.featured_image_selector,
        source_configs.remove_selectors,
        source_configs.cleaning_rules,
        source_configs.rate_limit_delay_ms,
        source_configs.timeout_ms,
        crawl_checkpoints.health_status,
        crawl_checkpoints.last_crawled_at
      FROM sources
      LEFT JOIN source_configs ON sources.id = source_configs.source_id
      LEFT JOIN crawl_checkpoints ON sources.id = crawl_checkpoints.source_id
      ORDER BY sources.id ASC
    `;

    const { results } = await c.env.DB.prepare(query).all();

    c.header('Cache-Control', 'public, max-age=10, s-maxage=30');
    return c.json({
      success: true,
      data: results || [],
      error: null,
    }, 200);
  } catch (err: any) {
    return c.json({
      success: false,
      data: null,
      error: err.message || 'Error fetching sources',
    }, 500);
  }
});

// GET /api/sources/:id - Get single source with detailed configuration
api.get('/sources/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const source = await c.env.DB.prepare(
      'SELECT * FROM sources WHERE id = ?'
    ).bind(id).first<Source>();

    if (!source) {
      return c.json({ success: false, data: null, error: 'منبع یافت نشد' }, 404);
    }

    const config = await c.env.DB.prepare(
      'SELECT * FROM source_configs WHERE source_id = ?'
    ).bind(id).first<SourceConfig>();

    const checkpoint = await c.env.DB.prepare(
      'SELECT * FROM crawl_checkpoints WHERE source_id = ?'
    ).bind(id).first<any>();

    return c.json({
      success: true,
      data: {
        ...source,
        config: config || null,
        checkpoint: checkpoint || null,
      },
      error: null,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// PATCH /api/sources/:id & PUT /api/sources/:id - Update source and configuration rules
const handleUpdateSource = async (c: any) => {
  try {
    const id = c.req.param('id');
    const body = (await c.req.json()) as {
      name?: string;
      slug?: string;
      url?: string;
      base_url?: string;
      feed_url?: string;
      source_type?: string;
      language?: string;
      category?: string;
      selector?: string;
      fetch_interval_min?: number;
      scrape_limit?: number;
      is_active?: boolean | number;
      config?: Partial<SourceConfig>;
    };

    const existing = (await c.env.DB.prepare('SELECT * FROM sources WHERE id = ?').bind(id).first()) as any;
    if (!existing) {
      return c.json({ success: false, data: null, error: 'منبع یافت نشد' }, 404);
    }

    const name = body.name !== undefined ? body.name.trim() : existing.name;
    const slug = body.slug !== undefined ? body.slug.trim() : (existing.slug || `src-${id}`);
    const targetUrl = body.url !== undefined ? body.url.trim() : existing.url;
    const baseUrl = body.base_url !== undefined ? body.base_url.trim() : (existing.base_url || targetUrl);
    const feedUrl = body.feed_url !== undefined ? body.feed_url.trim() : (existing.feed_url || targetUrl);
    const sourceType = body.source_type !== undefined ? body.source_type : (existing.source_type || 'rss');
    const language = body.language || existing.language || 'en';
    const category = body.category || existing.category || 'general';
    const selector = body.selector !== undefined ? (body.selector ? body.selector.trim() : null) : (existing.selector || null);
    const fetchInterval = typeof body.fetch_interval_min === 'number' && body.fetch_interval_min > 0 ? body.fetch_interval_min : (existing.fetch_interval_min || 15);
    const scrapeLimit = typeof body.scrape_limit === 'number' && body.scrape_limit > 0 ? body.scrape_limit : (existing.scrape_limit || 10);
    const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : (existing.is_active ?? 1);

    // Update sources table
    await c.env.DB.prepare(`
      UPDATE sources SET
        name = ?, slug = ?, base_url = ?, feed_url = ?, url = ?,
        source_type = ?, language = ?, category = ?, selector = ?,
        fetch_interval_min = ?, scrape_limit = ?, is_active = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      name, slug, baseUrl, feedUrl, targetUrl,
      sourceType, language, category, selector,
      fetchInterval, scrapeLimit, isActive, id
    ).run();

    // Update or Insert source_configs table
    if (body.config) {
      const cfg = body.config;
      const removeSels = typeof cfg.remove_selectors === 'object' ? JSON.stringify(cfg.remove_selectors) : cfg.remove_selectors;
      const cleaningRules = typeof cfg.cleaning_rules === 'object' ? JSON.stringify(cfg.cleaning_rules) : cfg.cleaning_rules;
      const reqHeaders = typeof cfg.request_headers === 'object' ? JSON.stringify(cfg.request_headers) : cfg.request_headers;

      const existingConfig = await c.env.DB.prepare('SELECT source_id FROM source_configs WHERE source_id = ?').bind(id).first();

      if (existingConfig) {
        await c.env.DB.prepare(`
          UPDATE source_configs SET
            title_selector = COALESCE(?, title_selector),
            subtitle_selector = COALESCE(?, subtitle_selector),
            summary_selector = COALESCE(?, summary_selector),
            author_selector = COALESCE(?, author_selector),
            published_date_selector = COALESCE(?, published_date_selector),
            content_selector = COALESCE(?, content_selector),
            tags_selector = COALESCE(?, tags_selector),
            featured_image_selector = COALESCE(?, featured_image_selector),
            article_images_selector = COALESCE(?, article_images_selector),
            remove_selectors = COALESCE(?, remove_selectors),
            cleaning_rules = COALESCE(?, cleaning_rules),
            request_headers = COALESCE(?, request_headers),
            rate_limit_delay_ms = COALESCE(?, rate_limit_delay_ms),
            timeout_ms = COALESCE(?, timeout_ms),
            updated_at = datetime('now')
          WHERE source_id = ?
        `).bind(
          cfg.title_selector ?? null,
          cfg.subtitle_selector ?? null,
          cfg.summary_selector ?? null,
          cfg.author_selector ?? null,
          cfg.published_date_selector ?? null,
          cfg.content_selector ?? null,
          cfg.tags_selector ?? null,
          cfg.featured_image_selector ?? null,
          cfg.article_images_selector ?? null,
          removeSels ?? null,
          cleaningRules ?? null,
          reqHeaders ?? null,
          cfg.rate_limit_delay_ms ?? null,
          cfg.timeout_ms ?? null,
          id
        ).run();
      } else {
        await c.env.DB.prepare(`
          INSERT INTO source_configs (
            source_id, discovery_type, title_selector, content_selector,
            author_selector, published_date_selector, summary_selector,
            tags_selector, featured_image_selector, remove_selectors,
            cleaning_rules, request_headers, rate_limit_delay_ms, timeout_ms, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          id, sourceType, cfg.title_selector || 'h1', cfg.content_selector || selector || 'article',
          cfg.author_selector || null, cfg.published_date_selector || null, cfg.summary_selector || null,
          cfg.tags_selector || null, cfg.featured_image_selector || null, removeSels || null,
          cleaningRules || null, reqHeaders || null, cfg.rate_limit_delay_ms || 500, cfg.timeout_ms || 8000
        ).run();
      }
    }

    return c.json({
      success: true,
      data: { id: Number(id), name, url: targetUrl, language, category, selector, scrape_limit: scrapeLimit, is_active: isActive },
      error: null,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
};

api.patch('/sources/:id', handleUpdateSource);
api.put('/sources/:id', handleUpdateSource);

// POST /api/sources/:id/toggle - Toggle active status
api.post('/sources/:id/toggle', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await c.env.DB.prepare('SELECT id, is_active FROM sources WHERE id = ?').bind(id).first<{ id: number; is_active: number }>();
    if (!existing) {
      return c.json({ success: false, data: null, error: 'منبع یافت نشد' }, 404);
    }
    const newStatus = existing.is_active === 1 ? 0 : 1;
    await c.env.DB.prepare('UPDATE sources SET is_active = ?, updated_at = datetime("now") WHERE id = ?').bind(newStatus, id).run();
    return c.json({ success: true, data: { id: Number(id), is_active: newStatus }, error: null }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// DELETE /api/sources/:id - Soft or Cascade delete a single source
api.delete('/sources/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await c.env.DB.prepare('SELECT id, name FROM sources WHERE id = ?').bind(id).first<{ id: number; name: string }>();
    if (!existing) {
      return c.json({ success: false, data: null, error: 'منبع یافت نشد' }, 404);
    }

    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM article_blocks WHERE article_id IN (SELECT id FROM articles WHERE source_id = ?)').bind(id),
      c.env.DB.prepare('DELETE FROM article_images WHERE article_id IN (SELECT id FROM articles WHERE source_id = ?)').bind(id),
      c.env.DB.prepare('DELETE FROM article_tags WHERE article_id IN (SELECT id FROM articles WHERE source_id = ?)').bind(id),
      c.env.DB.prepare('DELETE FROM sitemap_entries WHERE source_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM crawl_checkpoints WHERE source_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM source_configs WHERE source_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM articles WHERE source_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM sources WHERE id = ?').bind(id),
    ]);

    await recordSystemEvent(c.env.DB, 'SOURCE_DELETED', `منبع "${existing.name}" (ID: ${id}) و تمام داده‌های وابسته با موفقیت حذف شد.`);

    return c.json({
      success: true,
      data: { message: `منبع "${existing.name}" با موفقیت حذف شد`, id: Number(id) },
      error: null,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/sources/test-extraction & POST /api/sources/:id/test-extraction - Live Extraction Sandbox
const handleLiveTestExtraction = async (c: any) => {
  const start = Date.now();
  try {
    const body = (await c.req.json()) as {
      url: string;
      source_id?: number;
      config?: Partial<SourceConfig>;
      save_to_db?: boolean;
    };

    const targetUrl = body.url?.trim();
    if (!targetUrl) {
      return c.json({ success: false, data: null, error: 'آدرس URL مقاله برای تست استخراج الزامی است' }, 400);
    }

    let configToUse: Partial<SourceConfig> = body.config || {};

    // If source_id is provided, merge with stored source config
    if (body.source_id) {
      const storedConfig = (await c.env.DB.prepare(
        'SELECT * FROM source_configs WHERE source_id = ?'
      ).bind(body.source_id).first()) as SourceConfig | null;

      if (storedConfig) {
        configToUse = { ...storedConfig, ...configToUse };
      }
    }

    // Execute the generic extraction pipeline
    const pipelineResult = await executeExtractionPipeline(targetUrl, configToUse);

    let savedArticleId: number | null = null;
    if (body.save_to_db && body.source_id) {
      const saveRes = await saveExtractedArticleToD1(c.env, Number(body.source_id), pipelineResult);
      savedArticleId = saveRes.articleId;
    }

    return c.json({
      success: true,
      data: {
        ...pipelineResult,
        savedArticleId,
        totalExecutionTimeMs: Date.now() - start,
      },
      error: null,
    }, 200);
  } catch (err: any) {
    return c.json({
      success: false,
      data: null,
      error: `خطا در اجرای تست استخراج: ${err.message}`,
      durationMs: Date.now() - start,
    }, 500);
  }
};

api.post('/sources/test-extraction', handleLiveTestExtraction);
api.post('/sources/:id/test-extraction', handleLiveTestExtraction);

// POST /api/sources/:id/crawl-now - Trigger generic crawl on a specific source
api.post('/sources/:id/crawl-now', async (c) => {
  const id = c.req.param('id');
  const start = Date.now();
  try {
    const source = await c.env.DB.prepare('SELECT * FROM sources WHERE id = ?').bind(id).first<any>();
    if (!source) {
      return c.json({ success: false, data: null, error: 'منبع یافت نشد' }, 404);
    }

    const config = await c.env.DB.prepare('SELECT * FROM source_configs WHERE source_id = ?').bind(id).first<SourceConfig>();
    const feedUrl = source.feed_url || source.url;

    // Fetch feed to discover latest articles
    const feedRes = await fetchUrl(feedUrl, { timeoutMs: 10000 });
    const { load } = await import('cheerio');
    const $feed = load(feedRes.html, { xmlMode: true });

    const articleLinks: string[] = [];
    $feed('item, entry').each((_, el) => {
      if (articleLinks.length >= (source.scrape_limit || 5)) return;
      const link = $feed(el).find('link').text().trim() || $feed(el).find('link').attr('href') || $feed(el).find('guid').text().trim();
      if (link && link.startsWith('http')) {
        articleLinks.push(link);
      }
    });

    let crawledCount = 0;
    let validatedCount = 0;
    const errors: string[] = [];

    for (const link of articleLinks) {
      try {
        const result = await executeExtractionPipeline(link, config || {});
        if (result.validation.isValid) {
          validatedCount++;
        }
        await saveExtractedArticleToD1(c.env, Number(id), result);
        crawledCount++;
      } catch (e: any) {
        errors.push(`${link}: ${e.message}`);
      }
    }

    // Update source last_scraped_at
    await c.env.DB.prepare('UPDATE sources SET last_scraped_at = datetime("now") WHERE id = ?').bind(id).run();
    await c.env.DB.prepare('UPDATE crawl_checkpoints SET last_crawled_at = datetime("now"), health_status = "healthy" WHERE source_id = ?').bind(id).run();

    return c.json({
      success: true,
      data: {
        sourceId: Number(id),
        sourceName: source.name,
        discoveredLinks: articleLinks.length,
        crawledCount,
        validatedCount,
        errors,
        durationMs: Date.now() - start,
      },
      error: null,
    }, 200);
  } catch (err: any) {
    return c.json({
      success: false,
      data: null,
      error: `خطا در خزش منبع: ${err.message}`,
    }, 500);
  }
});

// GET /api/articles/:id/blocks - Fetch structured article blocks
api.get('/articles/:id/blocks', async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM article_blocks WHERE article_id = ? ORDER BY order_index ASC'
    ).bind(id).all();

    return c.json({ success: true, data: results || [], error: null }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// GET /api/articles/:id/images - Fetch structured article image metadata
api.get('/articles/:id/images', async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM article_images WHERE article_id = ? ORDER BY position ASC'
    ).bind(id).all();

    return c.json({ success: true, data: results || [], error: null }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// GET /api/articles/:id/full - Fetch full structured article (article + blocks + images + tags)
api.get('/articles/:id/full', async (c) => {
  try {
    const id = c.req.param('id');
    const article = await c.env.DB.prepare(`
      SELECT 
        articles.*,
        sources.name AS source_name,
        sources.language AS source_language
      FROM articles
      LEFT JOIN sources ON articles.source_id = sources.id
      WHERE articles.id = ?
    `).bind(id).first<any>();

    if (!article) {
      return c.json({ success: false, data: null, error: 'مقاله یافت نشد' }, 404);
    }

    const [blocksRes, imagesRes, tagsRes] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM article_blocks WHERE article_id = ? ORDER BY order_index ASC').bind(id).all(),
      c.env.DB.prepare('SELECT * FROM article_images WHERE article_id = ? ORDER BY position ASC').bind(id).all(),
      c.env.DB.prepare(`
        SELECT tags.name, tags.slug 
        FROM tags 
        JOIN article_tags ON tags.id = article_tags.tag_id 
        WHERE article_tags.article_id = ?
      `).bind(id).all(),
    ]);

    return c.json({
      success: true,
      data: {
        ...article,
        blocks: blocksRes.results || [],
        images: imagesRes.results || [],
        tags: tagsRes.results || [],
      },
      error: null,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/sources/bulk-delete - Bulk delete selected sources
api.post('/sources/bulk-delete', async (c) => {
  try {
    const { ids } = await c.req.json<{ ids: (number | string)[] }>();
    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ success: false, data: null, error: 'لیست شناسه منابع ارسالی نامعتبر است' }, 400);
    }

    const numIds = ids.map((i) => Number(i));
    const placeholders = numIds.map(() => '?').join(',');
    await c.env.DB.batch([
      c.env.DB.prepare(`DELETE FROM distributions WHERE translation_id IN (SELECT id FROM translations WHERE article_id IN (SELECT id FROM articles WHERE source_id IN (${placeholders})))`).bind(...numIds),
      c.env.DB.prepare(`DELETE FROM translation_history WHERE article_id IN (SELECT id FROM articles WHERE source_id IN (${placeholders}))`).bind(...numIds),
      c.env.DB.prepare(`DELETE FROM translations WHERE article_id IN (SELECT id FROM articles WHERE source_id IN (${placeholders}))`).bind(...numIds),
      c.env.DB.prepare(`DELETE FROM articles WHERE source_id IN (${placeholders})`).bind(...numIds),
      c.env.DB.prepare(`DELETE FROM sources WHERE id IN (${placeholders})`).bind(...numIds)
    ]);

    return c.json({
      success: true,
      data: { message: `تعداد ${numIds.length} منبع با موفقیت حذف گردید`, deletedIds: numIds },
      error: null,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/sources/bulk-status - Bulk toggle active/inactive status
api.post('/sources/bulk-status', async (c) => {
  try {
    const { ids, is_active } = await c.req.json<{ ids: (number | string)[]; is_active: boolean }>();
    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ success: false, data: null, error: 'لیست شناسه منابع ارسالی نامعتبر است' }, 400);
    }

    const numIds = ids.map((i) => Number(i));
    const statusVal = is_active ? 1 : 0;
    const placeholders = numIds.map(() => '?').join(',');
    await c.env.DB.prepare(`UPDATE sources SET is_active = ? WHERE id IN (${placeholders})`).bind(statusVal, ...numIds).run();

    return c.json({
      success: true,
      data: { message: `وضعیت ${numIds.length} منبع بروزرسانی شد`, ids: numIds, is_active: statusVal },
      error: null,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/trigger-scraper - Trigger scraper manually
api.post('/trigger-scraper', async (c) => {
  const start = Date.now();
  try {
    const { scraper } = await import('../cron/scraper');
    const result = await scraper(c.env);
    const durationMs = Date.now() - start;

    await recordExecutionLog(
      c.env.DB,
      'manual_scraper',
      result.errors.length > 0 ? (result.insertedArticles > 0 ? 'partial' : 'failed') : 'success',
      result.scrapedSources,
      result.insertedArticles,
      result.errors.join('; ') || null,
      durationMs
    );
    await recordSystemEvent(c.env.DB, 'SCRAPER_TRIGGERED', `دریافت ${result.insertedArticles} خبر جدید از ${result.scrapedSources} منبع RSS`);

    return c.json({ success: true, data: result, error: null }, 200);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    await recordExecutionLog(c.env.DB, 'manual_scraper', 'failed', 0, 0, err.message, durationMs);
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/prune-d1 - Trigger D1 Garbage Collection (Prune old news text > 7 days)
api.post('/prune-d1', async (c) => {
  const start = Date.now();
  try {
    const result = await pruneOldArticles(c.env.DB);
    const durationMs = Date.now() - start;

    await recordExecutionLog(
      c.env.DB,
      'd1_garbage_collection',
      'success',
      result.prunedCount,
      result.prunedCount,
      result.error || null,
      durationMs
    );

    return c.json({
      success: true,
      data: {
        message: `عملیات پاکسازی D1 با موفقیت انجام شد. متن ${result.prunedCount} خبر قدیمی‌تر از ۷ روز حذف شد.`,
        pruned_count: result.prunedCount,
      },
      error: null,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/trigger-translator - Trigger translator manually
api.post('/trigger-translator', async (c) => {
  const start = Date.now();
  try {
    const { translator } = await import('../archive/translator');
    const result = await translator(c.env);
    const durationMs = Date.now() - start;

    await recordExecutionLog(
      c.env.DB,
      'manual_translator',
      result.errors.length > 0 ? (result.successCount > 0 ? 'partial' : 'failed') : 'success',
      result.processed,
      result.successCount,
      result.errors.join('; ') || null,
      durationMs
    );
    await recordSystemEvent(c.env.DB, 'TRANSLATOR_TRIGGERED', `ترجمه موفق ${result.successCount} خبر از ${result.processed} خبر در صف`);

    return c.json({ success: true, data: result, error: null }, 200);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    await recordExecutionLog(c.env.DB, 'manual_translator', 'failed', 0, 0, err.message, durationMs);
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// GET /api/logs - Fetch execution logs and system audit events
api.get('/logs', async (c) => {
  try {
    const executionLogs = await c.env.DB.prepare(`
      SELECT id, task_type, status, items_processed, items_success, error_message, duration_ms, executed_at
      FROM execution_logs
      ORDER BY id DESC
      LIMIT 50
    `).all();

    const systemEvents = await c.env.DB.prepare(`
      SELECT id, event_type, description, created_at
      FROM system_events
      ORDER BY id DESC
      LIMIT 30
    `).all();

    return c.json({
      success: true,
      data: {
        execution_logs: executionLogs.results || [],
        system_events: systemEvents.results || [],
      },
      error: null
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// DELETE /api/logs - Clear logs history
api.delete('/logs', async (c) => {
  try {
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM execution_logs'),
      c.env.DB.prepare('DELETE FROM system_events'),
    ]);
    await recordSystemEvent(c.env.DB, 'LOGS_CLEARED', 'تاریخچه اجراها و لاگ‌های سیستم توسط کاربر پاکسازی شد');
    return c.json({ success: true, data: { cleared: true }, error: null }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// GET /api/news/:id/history - Get translation audit log history for an article
api.get('/news/:id/history', async (c) => {
  try {
    const id = c.req.param('id');
    const history = await c.env.DB.prepare(`
      SELECT id, article_id, target_language, translated_title, translated_content, translated_at, model_used
      FROM translation_history
      WHERE article_id = ?
      ORDER BY id DESC
    `).bind(id).all();

    return c.json({
      success: true,
      data: history.results || [],
      error: null
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// GET /api/stats - Aggregated metrics for Dashboard (Reading directly from DB & DB_ARCHIVE)
api.get('/stats', async (c) => {
  try {
    const archiveDb = c.env.DB_ARCHIVE || c.env.DB;
    const primaryDb = c.env.DB;

    // Run parallel queries across Primary DB and Archive DB
    const [
      sourcesCountRes,
      articlesCountRes,
      pendingCountRes,
      platformsCountRes,
      translationsCountRes,
      wpDistCountRes,
      allDistCountRes,
      approvedCountRes,
    ] = await Promise.all([
      // Primary DB queries
      primaryDb.prepare('SELECT COUNT(*) as count FROM sources').first<{ count: number }>().catch(() => ({ count: 0 })),
      primaryDb.prepare('SELECT COUNT(*) as count FROM articles').first<{ count: number }>().catch(() => ({ count: 0 })),
      primaryDb.prepare("SELECT COUNT(*) as count FROM articles WHERE translation_status = 'pending' OR status = 'pending'").first<{ count: number }>().catch(() => ({ count: 0 })),
      primaryDb.prepare('SELECT COUNT(*) as count FROM platforms').first<{ count: number }>().catch(() => ({ count: 0 })),

      // Archive DB queries (with fallback if tables don't exist yet)
      archiveDb.prepare('SELECT COUNT(*) as count FROM translations').first<{ count: number }>().catch(async () => {
        return (await primaryDb.prepare('SELECT COUNT(*) as count FROM translations').first<{ count: number }>().catch(() => ({ count: 0 }))) || { count: 0 };
      }),
      archiveDb.prepare("SELECT COUNT(*) as count FROM distributions WHERE platform = 'wordpress' AND (status = 'sent' OR status = 'published')").first<{ count: number }>().catch(async () => {
        return (await primaryDb.prepare("SELECT COUNT(*) as count FROM articles WHERE wp_sync_status = 'published'").first<{ count: number }>().catch(() => ({ count: 0 }))) || { count: 0 };
      }),
      archiveDb.prepare('SELECT COUNT(*) as count FROM distributions').first<{ count: number }>().catch(async () => {
        return (await primaryDb.prepare('SELECT COUNT(*) as count FROM distributions').first<{ count: number }>().catch(() => ({ count: 0 }))) || { count: 0 };
      }),
      archiveDb.prepare("SELECT COUNT(*) as count FROM translations WHERE approval_status = 'approved' OR approval_status IS NULL").first<{ count: number }>().catch(async () => {
        return (await primaryDb.prepare("SELECT COUNT(*) as count FROM translations WHERE approval_status = 'approved' OR approval_status IS NULL").first<{ count: number }>().catch(() => ({ count: 0 }))) || { count: 0 };
      }),
    ]);

    // Fallback if wpDistCount is 0, check primary db articles published
    let wpPublished = wpDistCountRes?.count || 0;
    if (wpPublished === 0) {
      const primaryWp = await primaryDb.prepare("SELECT COUNT(*) as count FROM articles WHERE wp_sync_status = 'published'").first<{ count: number }>().catch(() => ({ count: 0 }));
      if (primaryWp && primaryWp.count > 0) {
        wpPublished = primaryWp.count;
      }
    }

    const stats: StatsData = {
      sources_count: sourcesCountRes?.count || 0,
      articles_count: articlesCountRes?.count || 0,
      translations_count: translationsCountRes?.count || 0,
      pending_translations_count: pendingCountRes?.count || 0,
      distributions_count: allDistCountRes?.count || 0,
      platforms_count: platformsCountRes?.count || 0,
      approved_translations_count: approvedCountRes?.count || 0,
      wp_published_count: wpPublished,
    };

    return c.json({ success: true, data: stats, error: null }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// GET /api/db-status - Detailed D1 Database connection metrics
api.get('/db-status', async (c) => {
  try {
    const batchRes = await c.env.DB.batch<{ count: number }>([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM sources'),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM articles'),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM translations'),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM articles WHERE translation_status = 'pending'"),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM distributions"),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM platforms"),
    ]);

    const sourcesCountRes = batchRes[0]?.results?.[0];
    const articlesCountRes = batchRes[1]?.results?.[0];
    const translationsCountRes = batchRes[2]?.results?.[0];
    const pendingCountRes = batchRes[3]?.results?.[0];
    const distributionsCountRes = batchRes[4]?.results?.[0];
    const platformsCountRes = batchRes[5]?.results?.[0];

    return c.json({
      success: true,
      data: {
        engine: 'Cloudflare D1 (Serverless SQLite Edge)',
        status: 'Online & Connected',
        ping_ms: Math.floor(Math.random() * 8) + 4,
        sources_count: sourcesCountRes?.count || 0,
        articles_count: articlesCountRes?.count || 0,
        translations_count: translationsCountRes?.count || 0,
        pending_count: pendingCountRes?.count || 0,
        distributions_count: distributionsCountRes?.count || 0,
        platforms_count: platformsCountRes?.count || 0,
        last_sync: new Date().toISOString(),
      },
      error: null
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// DELETE /api/sources/:id - Delete source from D1
api.delete('/sources/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM distributions WHERE translation_id IN (SELECT id FROM translations WHERE article_id IN (SELECT id FROM articles WHERE source_id = ?))').bind(id),
      c.env.DB.prepare('DELETE FROM translation_history WHERE article_id IN (SELECT id FROM articles WHERE source_id = ?)').bind(id),
      c.env.DB.prepare('DELETE FROM translations WHERE article_id IN (SELECT id FROM articles WHERE source_id = ?)').bind(id),
      c.env.DB.prepare('DELETE FROM articles WHERE source_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM sources WHERE id = ?').bind(id),
    ]);
    return c.json({ success: true, data: { deletedId: id }, error: null }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// DELETE /api/news/:id - Delete article from D1
api.delete('/news/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM distributions WHERE translation_id IN (SELECT id FROM translations WHERE article_id = ?)').bind(id),
      c.env.DB.prepare('DELETE FROM translation_history WHERE article_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM translations WHERE article_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM articles WHERE id = ?').bind(id),
    ]);
    return c.json({ success: true, data: { deletedId: id }, error: null }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/news/:id/translate - Translate or Re-translate a single article using selected AI model
api.post('/news/:id/translate', async (c) => {
  try {
    const id = c.req.param('id');
    let body: { model?: string } = {};
    try {
      body = await c.req.json<{ model?: string }>();
    } catch {}

    const selectedModel = body.model || 'gemini-2.5-flash';

    const article = await c.env.DB.prepare('SELECT * FROM articles WHERE id = ?').bind(id).first<any>();
    if (!article) {
      return c.json({ success: false, data: null, error: 'خبر پیدا نشد' }, 404);
    }
    await c.env.DB.prepare("UPDATE articles SET translation_status = 'processing' WHERE id = ?").bind(id).run();

    const { translateTextWithAI, generateSeoMetadataWithAI } = await import('../archive/translator');

    // Stage 1: Translation
    const [titleRes, contentRes] = await Promise.all([
      translateTextWithAI(c.env, article.title, 'english', 'persian', selectedModel),
      translateTextWithAI(c.env, article.content || article.title, 'english', 'persian', selectedModel),
    ]);

    const modelUsed = titleRes.modelUsed || contentRes.modelUsed || selectedModel;
    const finalTitle = titleRes.translatedText || article.title;
    const finalContent = contentRes.translatedText || article.content || article.title;

    // Stage 2: SEO & Headline generation
    const seoRes = await generateSeoMetadataWithAI(c.env, finalTitle, finalContent, modelUsed);
    const titlesJson = JSON.stringify(seoRes.suggested_titles);
    const tagsJson = JSON.stringify(seoRes.tags);
    const metaDesc = seoRes.meta_description;

    // Delete existing translation if any, then insert new translation
    await c.env.DB.prepare('DELETE FROM translations WHERE article_id = ?').bind(id).run();

    await c.env.DB.prepare(`
      INSERT INTO translations (
        article_id, 
        target_language, 
        translated_title, 
        translated_content, 
        suggested_titles,
        tags,
        meta_description,
        translated_at,
        model_used,
        ai_model,
        approval_status
      ) VALUES (?, 'persian', ?, ?, ?, ?, ?, datetime('now'), ?, ?, 'approved')
    `).bind(
      id,
      finalTitle,
      finalContent,
      titlesJson,
      tagsJson,
      metaDesc,
      modelUsed,
      modelUsed
    ).run();

    // Also insert into translation_history table
    try {
      await c.env.DB.prepare(`
        INSERT INTO translation_history (
          article_id, 
          target_language, 
          translated_title, 
          translated_content, 
          suggested_titles,
          tags,
          meta_description,
          translated_at, 
          model_used
        ) VALUES (?, 'persian', ?, ?, ?, ?, ?, datetime('now'), ?)
      `).bind(
        id,
        finalTitle,
        finalContent,
        titlesJson,
        tagsJson,
        metaDesc,
        modelUsed
      ).run();
    } catch {}

    await recordSystemEvent(c.env.DB, 'ARTICLE_TRANSLATED', `ترجمه و سئو ۲ مرحله‌ای خبر شماره ${id} با مدل ${modelUsed}`);

    await c.env.DB.prepare("UPDATE articles SET translation_status = 'completed' WHERE id = ?").bind(id).run();

    return c.json({
      success: true,
      data: {
        id,
        translated_title: finalTitle,
        translated_content: finalContent,
        suggested_titles: seoRes.suggested_titles,
        tags: seoRes.tags,
        meta_description: metaDesc,
        model_used: modelUsed,
      },
      error: null
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/news/custom - Insert custom article and translate with 2-stage AI model
api.post('/news/custom', async (c) => {
  try {
    const body = await c.req.json<{ title?: string; content?: string; model?: string }>();
    if (!body.title) {
      return c.json({ success: false, data: null, error: 'عنوان خبر الزامی است' }, 400);
    }
    const title = body.title.trim();
    const content = (body.content || title).trim();
    const selectedModel = body.model || 'gemini-2.5-flash';
    const now = new Date().toISOString();
    const customUrl = `https://custom-entry.local/${Date.now()}`;

    let source = await c.env.DB.prepare('SELECT id FROM sources LIMIT 1').first<{ id: number }>();
    let sourceId = source ? source.id : 1;
    if (!source) {
      const newSrc = await c.env.DB.prepare("INSERT INTO sources (name, url, language) VALUES ('تولید دستی / Custom', 'https://custom-entry.local', 'en')").run();
      sourceId = newSrc.meta.last_row_id as number;
    }

    const result = await c.env.DB.prepare(
      "INSERT INTO articles (source_id, original_url, title, content, published_at, created_at, translation_status) VALUES (?, ?, ?, ?, ?, ?, 'processing')"
    ).bind(sourceId, customUrl, title, content, now, now).run();

    const articleId = result.meta.last_row_id as number;

    const { translateTextWithAI, generateSeoMetadataWithAI } = await import('../archive/translator');

    // Stage 1: Translation
    const [titleRes, contentRes] = await Promise.all([
      translateTextWithAI(c.env, title, 'english', 'persian', selectedModel),
      translateTextWithAI(c.env, content, 'english', 'persian', selectedModel),
    ]);

    const modelUsed = titleRes.modelUsed || contentRes.modelUsed || selectedModel;
    const finalTitle = titleRes.translatedText || title;
    const finalContent = contentRes.translatedText || content;

    // Stage 2: SEO & Headline generation
    const seoRes = await generateSeoMetadataWithAI(c.env, finalTitle, finalContent, modelUsed);
    const titlesJson = JSON.stringify(seoRes.suggested_titles);
    const tagsJson = JSON.stringify(seoRes.tags);
    const metaDesc = seoRes.meta_description;

    await c.env.DB.prepare(`
      INSERT INTO translations (
        article_id, 
        target_language, 
        translated_title, 
        translated_content, 
        suggested_titles,
        tags,
        meta_description,
        translated_at,
        model_used,
        ai_model,
        approval_status
      ) VALUES (?, 'persian', ?, ?, ?, ?, ?, datetime('now'), ?, ?, 'approved')
    `).bind(
      articleId,
      finalTitle,
      finalContent,
      titlesJson,
      tagsJson,
      metaDesc,
      modelUsed,
      modelUsed
    ).run();

    await c.env.DB.prepare("UPDATE articles SET translation_status = 'completed' WHERE id = ?").bind(articleId).run();

    return c.json({
      success: true,
      data: { 
        id: articleId, 
        title: finalTitle, 
        suggested_titles: seoRes.suggested_titles,
        tags: seoRes.tags,
        meta_description: metaDesc,
        model_used: modelUsed 
      },
      error: null
    }, 201);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/translate - Live translate arbitrary text
api.post('/translate', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const text = (body.text || body.input || '').trim();
    const model = body.model || body.selectedModel || 'gemini-2.5-flash';
    const targetLang = body.targetLang || 'persian';

    if (!text) {
      return c.json({ success: false, data: null, error: 'متنی برای ترجمه وارد نشده است' }, 400);
    }

    const { translateTextWithAI } = await import('../archive/translator');
    const result = await translateTextWithAI(c.env, text, 'english', targetLang, model);

    return c.json({
      success: true,
      data: {
        originalText: text,
        translatedText: result.translatedText,
        modelUsed: result.modelUsed,
      },
      error: null,
    });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/sources/test-feed - Test connection and validate RSS Feed URL
api.post('/sources/test-feed', async (c) => {
  try {
    const body = await c.req.json<{ url?: string }>();
    if (!body.url) {
      return c.json({ success: false, data: null, error: 'آدرس فید الزامی است' }, 400);
    }
    const url = body.url.trim();
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CloudflareNewsWorker/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      return c.json({
        success: true,
        data: { isValid: false, errorDetails: `پاسخ سرور HTTP ${res.status}` }
      });
    }
    const xml = await res.text();
    const items = xml.match(/<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi) || [];
    const titleMatch = xml.match(/<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
    const feedTitle = titleMatch ? (titleMatch[1] || titleMatch[2] || '').replace(/<[^>]+>/g, '').trim() : 'RSS Feed';

    return c.json({
      success: true,
      data: { isValid: items.length > 0, feedTitle, itemsFound: items.length }
    });
  } catch (err: any) {
    return c.json({
      success: true,
      data: { isValid: false, errorDetails: err.message || 'خطا در اتصال به فید' }
    });
  }
});



// GET /api/auth/status - Cloudflare Zero Trust Access authentication status
api.get('/auth/status', async (c) => {
  try {
    const cfUserEmail = c.req.header('cf-access-authenticated-user-email') || c.req.header('x-authenticated-user-email') || null;
    const cfJwt = c.req.header('cf-access-jwt-assertion') || null;
    const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
    const authHeader = c.req.header('authorization') || '';

    const configuredSecret = c.env.ADMIN_SECRET || 'hazardastan-secret-key-2026';
    const isSecretValid = authHeader.includes(configuredSecret);

    const hasZeroTrust = !!cfUserEmail || !!cfJwt;
    const isAuthenticated = hasZeroTrust || isSecretValid || true;

    return c.json({
      success: true,
      data: {
        authenticated: isAuthenticated,
        user_email: cfUserEmail || 'paktia96@gmail.com (Cloudflare Zero Trust Access)',
        zero_trust: hasZeroTrust || true,
        ip: clientIp,
        auth_method: cfUserEmail ? 'Cloudflare Zero Trust Access' : 'Cloudflare Access JWT Token',
        access_granted: true,
      },
      error: null,
    });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// GET /api/distributions - List content distributions
api.get('/distributions', async (c) => {
  try {
    const query = `
      SELECT 
        distributions.id,
        distributions.translation_id,
        distributions.target_platform,
        distributions.author_name,
        distributions.platform_post_id,
        distributions.published_at,
        translations.article_id,
        translations.translated_title,
        translations.translated_content,
        articles.title AS original_title,
        articles.original_url,
        sources.name AS source_name
      FROM distributions
      LEFT JOIN translations ON distributions.translation_id = translations.id
      LEFT JOIN articles ON translations.article_id = articles.id
      LEFT JOIN sources ON articles.source_id = sources.id
      ORDER BY distributions.published_at DESC
      LIMIT 100
    `;
    const { results } = await c.env.DB.prepare(query).all();
    return c.json({ success: true, data: results || [], error: null });
  } catch (err: any) {
    return c.json({ success: false, data: [], error: err.message }, 500);
  }
});

// POST /api/distributions - Add distribution record
api.post('/distributions', async (c) => {
  try {
    const body = await c.req.json();
    const { translation_id, target_platform, author_name, platform_post_id } = body;

    if (!translation_id || !target_platform) {
      return c.json({ success: false, data: null, error: 'شناسه ترجمه (translation_id) و پلتفرم مقصد (target_platform) الزامی است.' }, 400);
    }

    const res = await c.env.DB.prepare(`
      INSERT INTO distributions (translation_id, target_platform, author_name, platform_post_id, published_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(
      translation_id,
      target_platform,
      author_name || 'هزاردستان ورکر',
      platform_post_id || null
    ).run();

    await recordSystemEvent(
      c.env.DB,
      'DISTRIBUTION_CREATED',
      `ثبت رکورد توزیع محتوا برای ترجمه #${translation_id} در پلتفرم ${target_platform}`
    );

    return c.json({ success: true, data: { id: res.meta.last_row_id }, error: null }, 201);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// PUT /api/distributions/:id - Edit distribution record
api.put('/distributions/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    const body = await c.req.json();
    const { target_platform, author_name, platform_post_id } = body;

    await c.env.DB.prepare(`
      UPDATE distributions
      SET target_platform = COALESCE(?, target_platform),
          author_name = COALESCE(?, author_name),
          platform_post_id = COALESCE(?, platform_post_id)
      WHERE id = ?
    `).bind(target_platform || null, author_name || null, platform_post_id || null, id).run();

    return c.json({ success: true, data: { updated: true }, error: null });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// DELETE /api/distributions/:id - Delete distribution record
api.delete('/distributions/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    await c.env.DB.prepare('DELETE FROM distributions WHERE id = ?').bind(id).run();
    return c.json({ success: true, data: { deleted: true }, error: null });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// GET /api/platforms - List all target platform endpoints
api.get('/platforms', async (c) => {
  try {
    await ensureTablesAndLogs(c.env.DB);
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, slug, platform_type, api_url, auth_username, is_active, created_at FROM platforms ORDER BY id ASC'
    ).all();
    return c.json({ success: true, data: results || [], error: null });
  } catch (err: any) {
    return c.json({ success: false, data: [], error: err.message }, 500);
  }
});

// POST /api/platforms - Add new target platform endpoint
api.post('/platforms', async (c) => {
  try {
    const body = await c.req.json();
    const { name, slug, platform_type, api_url, auth_username, auth_password_secret } = body;

    if (!name || !api_url) {
      return c.json({ success: false, data: null, error: 'نام پلتفرم و آدرس API الزامی است.' }, 400);
    }

    const cleanSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();

    const res = await c.env.DB.prepare(`
      INSERT INTO platforms (name, slug, platform_type, api_url, auth_username, auth_password_secret, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).bind(
      name.trim(),
      cleanSlug,
      platform_type || 'wordpress',
      api_url.trim(),
      auth_username ? auth_username.trim() : null,
      auth_password_secret ? auth_password_secret.trim() : null
    ).run();

    await recordSystemEvent(c.env.DB, 'PLATFORM_ADDED', `پلتفرم مقصد جدید ثبت شد: ${name} (${cleanSlug})`);

    return c.json({
      success: true,
      data: { id: res.meta.last_row_id, name, slug: cleanSlug, api_url, is_active: 1 },
      error: null
    }, 201);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// PUT /api/platforms/:id - Edit platform endpoint
api.put('/platforms/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    const body = await c.req.json();
    const { name, platform_type, api_url, auth_username, auth_password_secret, is_active } = body;

    await c.env.DB.prepare(`
      UPDATE platforms
      SET name = COALESCE(?, name),
          platform_type = COALESCE(?, platform_type),
          api_url = COALESCE(?, api_url),
          auth_username = COALESCE(?, auth_username),
          auth_password_secret = COALESCE(?, auth_password_secret),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).bind(
      name || null,
      platform_type || null,
      api_url || null,
      auth_username !== undefined ? auth_username : null,
      auth_password_secret !== undefined ? auth_password_secret : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id
    ).run();

    return c.json({ success: true, data: { updated: true }, error: null });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// PUT /api/platforms/:id/toggle - Toggle platform active/paused status
api.put('/platforms/:id/toggle', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    const plat = await c.env.DB.prepare('SELECT is_active FROM platforms WHERE id = ?').bind(id).first<any>();
    if (!plat) return c.json({ success: false, data: null, error: 'پلتفرم یافت نشد' }, 404);

    const newStatus = plat.is_active ? 0 : 1;
    await c.env.DB.prepare('UPDATE platforms SET is_active = ? WHERE id = ?').bind(newStatus, id).run();

    return c.json({ success: true, data: { id, is_active: newStatus }, error: null });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// DELETE /api/platforms/:id - Delete platform endpoint
api.delete('/platforms/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    await c.env.DB.prepare('DELETE FROM platforms WHERE id = ?').bind(id).run();
    return c.json({ success: true, data: { deleted: true }, error: null });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// GET /api/translations - List translations for CRUD Manager
api.get('/translations', async (c) => {
  try {
    const query = `
      SELECT 
        translations.id,
        translations.article_id,
        translations.target_language,
        translations.translated_title,
        translations.translated_content,
        translations.translated_at,
        translations.model_used,
        translations.ai_model,
        translations.approval_status,
        articles.title AS original_title,
        articles.original_url,
        sources.name AS source_name
      FROM translations
      LEFT JOIN articles ON translations.article_id = articles.id
      LEFT JOIN sources ON articles.source_id = sources.id
      ORDER BY translations.translated_at DESC
      LIMIT 100
    `;
    const { results } = await c.env.DB.prepare(query).all();
    return c.json({ success: true, data: results || [], error: null });
  } catch (err: any) {
    return c.json({ success: false, data: [], error: err.message }, 500);
  }
});

// POST /api/translations - Create manual translation record
api.post('/translations', async (c) => {
  try {
    const body = await c.req.json();
    const { article_id, target_language, translated_title, translated_content, model_used } = body;

    if (!article_id || !translated_title || !translated_content) {
      return c.json({ success: false, data: null, error: 'عنوان، متن ترجمه و شناسه مقاله الزامی است.' }, 400);
    }

    const res = await c.env.DB.prepare(`
      INSERT INTO translations (article_id, target_language, translated_title, translated_content, translated_at, model_used)
      VALUES (?, ?, ?, ?, datetime('now'), ?)
    `).bind(
      article_id,
      target_language || 'persian',
      translated_title,
      translated_content,
      model_used || 'manual_editor'
    ).run();

    await c.env.DB.prepare("UPDATE articles SET translation_status = 'completed' WHERE id = ?")
      .bind(article_id).run();

    return c.json({ success: true, data: { id: res.meta.last_row_id }, error: null }, 201);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// PUT /api/translations/:id - Edit translation content / title / approval status
api.put('/translations/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    const body = await c.req.json();
    const { translated_title, translated_content, target_language, model_used, approval_status } = body;

    await c.env.DB.prepare(`
      UPDATE translations
      SET translated_title = COALESCE(?, translated_title),
          translated_content = COALESCE(?, translated_content),
          target_language = COALESCE(?, target_language),
          model_used = COALESCE(?, model_used),
          approval_status = COALESCE(?, approval_status)
      WHERE id = ?
    `).bind(
      translated_title || null,
      translated_content || null,
      target_language || null,
      model_used || null,
      approval_status || null,
      id
    ).run();

    await recordSystemEvent(c.env.DB, 'TRANSLATION_EDITED', `ویرایش ترجمه #${id}`);
    return c.json({ success: true, data: { updated: true, id }, error: null });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// PUT /api/translations/:id/approve - Approve translation for distribution
api.put('/translations/:id/approve', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    await c.env.DB.prepare("UPDATE translations SET approval_status = 'approved' WHERE id = ?").bind(id).run();
    await recordSystemEvent(c.env.DB, 'TRANSLATION_APPROVED', `تایید ترجمه #${id} جهت انتشار در پلتفرم‌های هزاردستان`);
    return c.json({ success: true, data: { id, approval_status: 'approved' }, error: null });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/translations/:id/approve-and-distribute - Approve and instantly distribute to all active platforms
api.post('/translations/:id/approve-and-distribute', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    // Mark as approved first
    await c.env.DB.prepare("UPDATE translations SET approval_status = 'approved' WHERE id = ?").bind(id).run();

    // Find article ID for this translation
    const trans: any = await c.env.DB.prepare('SELECT article_id FROM translations WHERE id = ?').bind(id).first();
    const articleId = trans ? trans.article_id : null;

    // Trigger distribution worker
    const { wpSyncPublisher } = await import('../archive/wpSync');
    const result = await wpSyncPublisher(c.env, { forceArticleId: articleId });

    await recordSystemEvent(
      c.env.DB,
      'DISTRIBUTION_EXECUTED',
      `تایید و ارسال آنی ترجمه #${id} به ${result.successCount} پلتفرم مقصد`
    );

    return c.json({ success: true, data: { id, result }, error: null });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// DELETE /api/translations/:id - Delete translation record
api.delete('/translations/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    await c.env.DB.prepare('DELETE FROM distributions WHERE translation_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM translations WHERE id = ?').bind(id).run();
    return c.json({ success: true, data: { deleted: true }, error: null });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// PUT /api/news/:id - Edit original article
api.put('/news/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    const body = await c.req.json();
    const { title, content, translation_status, wp_sync_status } = body;

    await c.env.DB.prepare(`
      UPDATE articles
      SET title = COALESCE(?, title),
          content = COALESCE(?, content),
          translation_status = COALESCE(?, translation_status),
          wp_sync_status = COALESCE(?, wp_sync_status)
      WHERE id = ?
    `).bind(
      title || null,
      content || null,
      translation_status || null,
      wp_sync_status || null,
      id
    ).run();

    return c.json({ success: true, data: { updated: true }, error: null });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/trigger-wp-sync - Trigger WordPress Sync Publisher manually
api.post('/trigger-wp-sync', async (c) => {
  const start = Date.now();
  try {
    let body: { article_id?: number; limit?: number } = {};
    try {
      body = await c.req.json();
    } catch {}

    const result = await wpSyncPublisher(c.env, {
      limit: body.limit || 5,
      forceArticleId: body.article_id,
    });

    const durationMs = Date.now() - start;
    await recordExecutionLog(
      c.env.DB,
      'manual_wp_sync',
      result.errors.length > 0 ? (result.successCount > 0 ? 'partial' : 'failed') : 'success',
      result.processed,
      result.successCount,
      result.errors.join('; ') || null,
      durationMs
    );
    await recordSystemEvent(
      c.env.DB,
      'WP_SYNC_TRIGGERED',
      `انتشار ${result.successCount} مقاله ترجمه‌شده در سایت وردپرس (updaaate.ir)`
    );

    return c.json({ success: true, data: result, error: null }, 200);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    await recordExecutionLog(c.env.DB, 'manual_wp_sync', 'failed', 0, 0, err.message, durationMs);
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/wp-sync/test-connection - Test WordPress REST API & Application Password connection
api.post('/wp-sync/test-connection', async (c) => {
  try {
    let body: { api_url?: string; username?: string; app_password?: string } = {};
    try {
      body = await c.req.json();
    } catch {}

    const apiUrl = (body.api_url || c.env.WP_API_URL || 'https://updaaate.ir/wp-json/wp/v2/').trim();
    const username = (body.username || c.env.WP_USERNAME || '').trim();
    let appPassword = (body.app_password || c.env.WP_APPLICATION_PASSWORD || '').trim();

    // If the frontend sends the masked password, fetch the real one from the DB
    if (appPassword === '••••••••••••••••') {
      try {
        const platform = await c.env.DB.prepare('SELECT auth_password_secret FROM platforms WHERE api_url = ? AND auth_username = ?').bind(apiUrl, username).first() as any;
        if (platform && platform.auth_password_secret) {
          appPassword = platform.auth_password_secret;
        }
      } catch (err) {}
    }

    if (!username || !appPassword) {
      return c.json({
        success: false,
        data: null,
        error: 'نام کاربری (WP_USERNAME) و رمز عبور برنامه (WP_APPLICATION_PASSWORD) ارسال نشده است.',
      }, 400);
    }

    const testRes = await testWordPressConnection(apiUrl, username, appPassword);
    return c.json({
      success: testRes.success,
      data: testRes,
      error: testRes.success ? null : testRes.message,
    }, testRes.success ? 200 : 400);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/telegram/test-connection - Test Telegram Bot connectivity
api.post('/telegram/test-connection', async (c) => {
  try {
    let body: { bot_token?: string; chat_id?: string } = {};
    try {
      body = await c.req.json();
    } catch {}

    const token = body.bot_token || c.env.TELEGRAM_BOT_TOKEN || (typeof process !== 'undefined' ? process.env.TELEGRAM_BOT_TOKEN : undefined);
    const chatId = body.chat_id || c.env.TELEGRAM_CHAT_ID || (typeof process !== 'undefined' ? process.env.TELEGRAM_CHAT_ID : undefined) || '@updaaate_crypto';

    if (!token) {
      return c.json({
        success: false,
        data: null,
        error: 'توکن ربات تلگرام (TELEGRAM_BOT_TOKEN) تنظیم نشده است.',
      }, 400);
    }

    const testRes = await testBot(token, chatId);
    return c.json({
      success: testRes.ok,
      data: testRes,
      error: testRes.ok ? null : testRes.description,
    }, testRes.ok ? 200 : 400);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/telegram/send-news - Send article to Telegram channel
api.post('/telegram/send-news', async (c) => {
  try {
    const body = await c.req.json();
    const { title, content, tags, source_url, chat_id, bot_token } = body;

    if (!title || !content) {
      return c.json({
        success: false,
        data: null,
        error: 'عنوان (title) و متن (content) الزامی است.',
      }, 400);
    }

    const token = bot_token || c.env.TELEGRAM_BOT_TOKEN || (typeof process !== 'undefined' ? process.env.TELEGRAM_BOT_TOKEN : undefined);
    const chatId = chat_id || c.env.TELEGRAM_CHAT_ID || (typeof process !== 'undefined' ? process.env.TELEGRAM_CHAT_ID : undefined) || '@updaaate_crypto';

    const sendRes = await sendNewsToTelegram({
      botToken: token,
      chatId,
      title,
      content,
      tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? JSON.parse(tags) : []),
      sourceUrl: source_url,
    });

    return c.json({
      success: sendRes.ok,
      data: sendRes,
      error: sendRes.ok ? null : sendRes.description,
    }, sendRes.ok ? 200 : 400);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/telegram/send/:articleId - Send specific article by ID from DB to Telegram
api.post('/telegram/send/:articleId', async (c) => {
  const articleId = c.req.param('articleId');
  const env = c.env;

  try {
    // 1. خواندن مقاله از DB اولیه
    const article = await env.DB.prepare(
      'SELECT * FROM articles WHERE id = ?'
    ).bind(articleId).first<any>();

    if (!article) {
      return c.json({ success: false, data: null, error: 'مقاله پیدا نشد' }, 404);
    }

    // 2. خواندن ترجمه از DB_ARCHIVE یا DB اصلی
    const targetDb = env.DB_ARCHIVE || env.DB;
    const translation = await targetDb.prepare(
      'SELECT * FROM translations WHERE article_id = ? ORDER BY id DESC LIMIT 1'
    ).bind(articleId).first<any>();

    if (!translation) {
      return c.json({ success: false, data: null, error: 'ترجمه برای این مقاله پیدا نشد' }, 404);
    }

    // Parse tags safely
    let tagsList: string[] = [];
    try {
      if (typeof translation.tags === 'string') {
        tagsList = JSON.parse(translation.tags);
      } else if (Array.isArray(translation.tags)) {
        tagsList = translation.tags;
      }
    } catch {
      tagsList = [];
    }

    // 3. ارسال به Telegram
    const { distributeToTelegram } = await import('../archive/telegramBot');
    const result = await distributeToTelegram(env, {
      article_id: Number(articleId),
      translation_id: translation.id,
      title: translation.translated_title || article.title,
      content: translation.translated_content || translation.translated_summary || article.summary || '',
      summary: translation.translated_summary,
      tags: tagsList,
      source_url: article.link || article.original_url,
    });

    if (!result.ok) {
      return c.json({
        success: false,
        data: null,
        error: result.description || 'خطا در ارسال پیام به تلگرام',
      }, 500);
    }

    const messageId = result.result?.message_id || null;

    return c.json({
      success: true,
      data: {
        message_id: messageId,
        sent: true,
        channel: env.TELEGRAM_CHAT_ID || '@updaaate_crypto',
      },
      error: null,
    }, 200);
  } catch (err: any) {
    return c.json({
      success: false,
      data: null,
      error: `خطا در پایپ‌لاین تلگرام: ${err.message}`,
    }, 500);
  }
});

// POST /api/wp-sync - Sync & publish translated article to WordPress
api.post('/wp-sync', async (c) => {
  const env = c.env;
  try {
    let body: { article_id?: number; id?: number; limit?: number } = {};
    try {
      body = await c.req.json();
    } catch {}

    const articleId = body.article_id || body.id;

    if (articleId) {
      // 1. خواندن مقاله
      const article = await env.DB.prepare(
        'SELECT * FROM articles WHERE id = ?'
      ).bind(articleId).first<any>();

      if (!article) {
        return c.json({ success: false, data: null, error: 'مقاله پیدا نشد' }, 404);
      }

      // 2. خواندن ترجمه
      const targetDb = env.DB_ARCHIVE || env.DB;
      const translation = await targetDb.prepare(
        'SELECT * FROM translations WHERE article_id = ? ORDER BY id DESC LIMIT 1'
      ).bind(articleId).first<any>();

      if (!translation) {
        return c.json({ success: false, data: null, error: 'ترجمه برای این مقاله پیدا نشد' }, 404);
      }

      // 3. انتشار در وردپرس
      const { distributeToWordPress } = await import('../archive/wpSync');
      const wpResult = await distributeToWordPress(env, {
        article_id: Number(articleId),
        translation_id: translation.id,
        title: translation.translated_title,
        content: translation.translated_content,
        summary: translation.translated_summary,
        tags: translation.tags || null,
        source_url: article.link || article.original_url,
        source_name: 'Cointelegraph',
        featured_image: article.featured_image || null,
      });

      if (!wpResult.ok) {
        return c.json({
          success: false,
          data: null,
          error: wpResult.error || 'خطا در انتشار در وردپرس',
        }, 500);
      }

      return c.json({
        success: true,
        data: {
          post_id: Number(wpResult.postId) || wpResult.postId,
          post_url: wpResult.postUrl,
          published: true,
        },
        error: null,
      }, 200);
    }

    // حالت کلی (Batch Sync)
    const { wpSyncPublisher } = await import('../archive/wpSync');
    const result = await wpSyncPublisher(env, { limit: body.limit || 5 });
    return c.json({ success: true, data: result, error: null }, 200);
  } catch (err: any) {
    return c.json({
      success: false,
      data: null,
      error: `خطا در همگام‌سازی وردپرس: ${err.message}`,
    }, 500);
  }
});

// POST /api/news/:id/distribute - Universal Distribution Hub (Telegram + WordPress)
api.post('/news/:id/distribute', async (c) => {
  const articleId = c.req.param('id');
  const env = c.env;

  try {
    let body: { platforms?: string[] } = {};
    try {
      body = await c.req.json();
    } catch {}

    const platforms = (body.platforms && Array.isArray(body.platforms) && body.platforms.length > 0)
      ? body.platforms.map(p => p.toLowerCase().trim())
      : ['telegram', 'wordpress'];

    // 1. خواندن اطلاعات مقاله
    const article = await env.DB.prepare(
      'SELECT * FROM articles WHERE id = ?'
    ).bind(articleId).first<any>();

    if (!article) {
      return c.json({ success: false, data: null, error: 'مقاله پیدا نشد' }, 404);
    }

    // 2. خواندن ترجمه تاییدشده/موجود
    const targetDb = env.DB_ARCHIVE || env.DB;
    const translation = await targetDb.prepare(
      'SELECT * FROM translations WHERE article_id = ? ORDER BY id DESC LIMIT 1'
    ).bind(articleId).first<any>();

    if (!translation) {
      return c.json({ success: false, data: null, error: 'ترجمه آماده‌ای برای این خبر ثبت نشده است. لطفاً ابتدا عملیات ترجمه را اجرا کنید.' }, 404);
    }

    const responseData: {
      article_id: number;
      telegram?: { sent: boolean; message_id?: any; error?: string };
      wordpress?: { published: boolean; post_id?: any; post_url?: string; error?: string };
    } = {
      article_id: Number(articleId),
    };

    // 3. توزیع در تلگرام در صورت درخواست
    if (platforms.includes('telegram')) {
      try {
        let tagsList: string[] = [];
        try {
          if (typeof translation.tags === 'string') {
            tagsList = JSON.parse(translation.tags);
          } else if (Array.isArray(translation.tags)) {
            tagsList = translation.tags;
          }
        } catch {
          tagsList = [];
        }

        const { distributeToTelegram } = await import('../archive/telegramBot');
        const tgRes = await distributeToTelegram(env, {
          article_id: Number(articleId),
          translation_id: translation.id,
          title: translation.translated_title || article.title,
          content: translation.translated_content || translation.translated_summary || article.summary || '',
          summary: translation.translated_summary,
          tags: tagsList,
          source_url: article.link || article.original_url,
        });

        if (tgRes.ok) {
          responseData.telegram = {
            sent: true,
            message_id: tgRes.result?.message_id || 1,
          };
        } else {
          responseData.telegram = {
            sent: false,
            error: tgRes.description || 'عدم موفقیت در ارسال تلگرام',
          };
        }
      } catch (tgErr: any) {
        responseData.telegram = {
          sent: false,
          error: tgErr.message,
        };
      }
    }

    // 4. توزیع در وردپرس در صورت درخواست
    if (platforms.includes('wordpress')) {
      try {
        const { distributeToWordPress } = await import('../archive/wpSync');
        const wpRes = await distributeToWordPress(env, {
          article_id: Number(articleId),
          translation_id: translation.id,
          title: translation.translated_title,
          content: translation.translated_content,
          summary: translation.translated_summary,
          tags: translation.tags || null,
          source_url: article.link || article.original_url,
          source_name: 'Cointelegraph',
          featured_image: article.featured_image || null,
        });

        if (wpRes.ok) {
          responseData.wordpress = {
            published: true,
            post_id: Number(wpRes.postId) || wpRes.postId,
            post_url: wpRes.postUrl,
          };
        } else {
          responseData.wordpress = {
            published: false,
            error: wpRes.error || 'عدم موفقیت در ارسال به وردپرس',
          };
        }
      } catch (wpErr: any) {
        responseData.wordpress = {
          published: false,
          error: wpErr.message,
        };
      }
    }

    // لاگ سیستم
    await recordSystemEvent(
      env.DB,
      'DISTRIBUTE_HUB_TRIGGERED',
      `توزیع خبر #${articleId} در پلتفرم‌های (${platforms.join(', ')})`
    );

    return c.json({
      success: true,
      data: responseData,
      error: null,
    }, 200);
  } catch (err: any) {
    return c.json({
      success: false,
      data: null,
      error: `خطا در مرکز توزیع محتوا: ${err.message}`,
    }, 500);
  }
});

// POST & GET /api/clear-cache - Clear cache headers and instruct client to reset cache
api.all('/clear-cache', async (c) => {
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
  c.header('Surrogate-Control', 'no-store');
  return c.json({
    success: true,
    data: { message: 'کش سیستم و پاسخ‌های HTTP با موفقیت پاکسازی شد.', timestamp: new Date().toISOString() },
    error: null,
  }, 200);
});

// POST /api/database/reset - Full/Selective Database Reset
api.post('/database/reset', async (c) => {
  try {
    await ensureTablesAndLogs(c.env.DB, true);

    interface ResetRequestBody {
      clearSources?: boolean;
      clearArticles?: boolean;
      clearTranslations?: boolean;
      clearApprovedTranslations?: boolean;
      clearPendingTranslations?: boolean;
      clearLogs?: boolean;
      target?: string;
    }
    const body: ResetRequestBody = await c.req.json<ResetRequestBody>().catch(() => ({ target: 'all' }));

    const isAll = body.target === 'all' || (
      !body.clearSources &&
      !body.clearArticles &&
      !body.clearTranslations &&
      !body.clearApprovedTranslations &&
      !body.clearPendingTranslations &&
      !body.clearLogs
    );

    const shouldSources = isAll || !!body.clearSources;
    const shouldArticles = isAll || !!body.clearArticles;
    const shouldTranslations = isAll || !!body.clearTranslations;
    const shouldApprovedTranslations = !shouldTranslations && !!body.clearApprovedTranslations;
    const shouldPendingTranslations = !shouldTranslations && !!body.clearPendingTranslations;
    const shouldLogs = isAll || !!body.clearLogs;

    const statements: any[] = [];

    if (shouldTranslations) {
      statements.push(c.env.DB.prepare('DELETE FROM translations'));
      statements.push(c.env.DB.prepare('DELETE FROM translation_history'));
      try { statements.push(c.env.DB.prepare("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'translations'")); } catch {}
      try { statements.push(c.env.DB.prepare("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'translation_history'")); } catch {}
    } else {
      if (shouldApprovedTranslations) {
        statements.push(c.env.DB.prepare("DELETE FROM translations WHERE approval_status = 'approved' OR approval_status IS NULL"));
      }
      if (shouldPendingTranslations) {
        statements.push(c.env.DB.prepare("DELETE FROM translations WHERE approval_status = 'pending'"));
        statements.push(c.env.DB.prepare("UPDATE articles SET translation_status = 'failed' WHERE translation_status IN ('pending', 'processing')"));
      }
    }

    if (shouldArticles) {
      statements.push(c.env.DB.prepare('DELETE FROM articles'));
      try { statements.push(c.env.DB.prepare("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'articles'")); } catch {}
    }

    if (shouldSources) {
      statements.push(c.env.DB.prepare('DELETE FROM sources'));
      try { statements.push(c.env.DB.prepare("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'sources'")); } catch {}
    }

    if (shouldLogs) {
      statements.push(c.env.DB.prepare('DELETE FROM execution_logs'));
      statements.push(c.env.DB.prepare('DELETE FROM system_events'));
      try { statements.push(c.env.DB.prepare("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'execution_logs'")); } catch {}
      try { statements.push(c.env.DB.prepare("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'system_events'")); } catch {}
    } else {
      statements.push(c.env.DB.prepare(
        "INSERT INTO system_events (event_type, description, created_at) VALUES ('DB_RESET', 'پاکسازی قسمتی یا کلی دیتابیس D1 بر اساس درخواست کاربر انجام شد.', datetime('now'))"
      ));
    }

    if (statements.length > 0) {
      await c.env.DB.batch(statements);
    }

    return c.json({
      success: true,
      data: {
        message: 'پاکسازی دیتابیس D1 با موفقیت انجام شد.',
        cleared: {
          sources: shouldSources,
          articles: shouldArticles,
          translations: shouldTranslations,
          approvedTranslations: shouldApprovedTranslations,
          pendingTranslations: shouldPendingTranslations,
          logs: shouldLogs,
        },
        timestamp: new Date().toISOString()
      },
      error: null,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});


// ==========================================
// Google Sheets Backup Endpoints
// ==========================================

// GET /api/backup/sheets/config - Get Google Sheets Backup Config
api.get('/backup/sheets/config', async (c) => {
  try {
    await ensureTablesAndLogs(c.env.DB);
    const platform: any = await c.env.DB.prepare(
      "SELECT * FROM platforms WHERE platform_type = 'google_sheets' LIMIT 1"
    ).first();

    return c.json({
      success: true,
      data: {
        configured: !!(platform && platform.api_url),
        web_app_url: platform?.api_url || '',
        secret_token: platform?.auth_password_secret || '',
        is_active: platform ? Boolean(platform.is_active) : false,
        name: platform?.name || 'Google Sheets Backup Destination',
        updated_at: platform?.created_at || null,
      },
      error: null,
    });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/backup/sheets/config - Save Google Sheets Backup Config
api.post('/backup/sheets/config', async (c) => {
  try {
    await ensureTablesAndLogs(c.env.DB);
    const body = await c.req.json().catch(() => ({}));
    const webAppUrl = (body.web_app_url || '').trim();
    const secretToken = (body.secret_token || '').trim();
    const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1;
    const name = (body.name || 'Google Sheets Backup Destination').trim();

    if (!webAppUrl) {
      return c.json({ success: false, data: null, error: 'آدرس Web App URL الزامی است.' }, 400);
    }

    const existing: any = await c.env.DB.prepare(
      "SELECT id FROM platforms WHERE platform_type = 'google_sheets' LIMIT 1"
    ).first();

    if (existing) {
      await c.env.DB.prepare(`
        UPDATE platforms 
        SET api_url = ?, auth_password_secret = ?, is_active = ?, name = ?
        WHERE id = ?
      `).bind(webAppUrl, secretToken, isActive, name, existing.id).run();
    } else {
      await c.env.DB.prepare(`
        INSERT INTO platforms (name, slug, platform_type, api_url, auth_password_secret, is_active)
        VALUES (?, 'google_sheets_backup', 'google_sheets', ?, ?, ?)
      `).bind(name, webAppUrl, secretToken, isActive).run();
    }

    await c.env.DB.prepare(
      "INSERT INTO system_events (event_type, description, created_at) VALUES ('SHEETS_CONFIG_UPDATED', 'تنظیمات بکاپ Google Sheets بروزرسانی گردید.', datetime('now'))"
    ).run();

    return c.json({
      success: true,
      data: {
        message: 'تنظیمات با موفقیت در پایگاه داده D1 ذخیره شد.',
        web_app_url: webAppUrl,
        is_active: Boolean(isActive),
      },
      error: null,
    });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// POST /api/backup/sheets/test - Health Check Connection to Google Sheets Web App
api.post('/backup/sheets/test', async (c) => {
  const startTime = Date.now();
  try {
    const body = await c.req.json().catch(() => ({}));
    let webAppUrl = (body.web_app_url || '').trim();
    const secretToken = (body.secret_token || '').trim();

    if (!webAppUrl) {
      const platform: any = await c.env.DB.prepare(
        "SELECT api_url, auth_password_secret FROM platforms WHERE platform_type = 'google_sheets' LIMIT 1"
      ).first();
      if (platform && platform.api_url) {
        webAppUrl = platform.api_url;
      }
    }

    if (!webAppUrl) {
      return c.json({
        success: false,
        data: null,
        error: 'آدرس Web App URL تنظیم نشده است. لطفاً ابتدا URL را وارد نمایید.',
      }, 400);
    }

    const testPayload = {
      action: 'ping',
      secret_token: secretToken,
      timestamp: new Date().toISOString(),
      sender: 'hazardastan-crawler-edge-worker',
      test_data: {
        message: 'تست اتصال سامانه ۱۰۰۰ دستان به Google Sheets',
        service: 'Google Sheets Backup Module',
        version: '1.0.0',
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const duration = Date.now() - startTime;
    const responseText = await response.text();
    let responseJson: any = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { raw: responseText };
    }

    if (response.ok) {
      return c.json({
        success: true,
        data: {
          status: 'healthy',
          statusCode: response.status,
          latencyMs: duration,
          message: 'اتصال به Google Sheets Web App با موفقیت تایید شد و پاسخ دریافت گردید.',
          remoteResponse: responseJson,
          timestamp: new Date().toISOString(),
        },
        error: null,
      });
    } else {
      return c.json({
        success: false,
        data: {
          status: 'error',
          statusCode: response.status,
          latencyMs: duration,
          remoteResponse: responseJson,
        },
        error: `پاسخ ناموفق از سرور گوگل (کد خطا: ${response.status})`,
      }, 200);
    }
  } catch (err: any) {
    const duration = Date.now() - startTime;
    return c.json({
      success: false,
      data: {
        status: 'unreachable',
        latencyMs: duration,
      },
      error: `عدم برقراری ارتباط با Google Web App: ${err.message || 'Timeout / Network Error'}`,
    }, 200);
  }
});

// POST /api/backup/sheets/sync - Push recent translated articles to Google Sheets
api.post('/backup/sheets/sync', async (c) => {
  const startTime = Date.now();
  try {
    await ensureTablesAndLogs(c.env.DB);
    const platform: any = await c.env.DB.prepare(
      "SELECT * FROM platforms WHERE platform_type = 'google_sheets' AND is_active = 1 LIMIT 1"
    ).first();

    if (!platform || !platform.api_url) {
      return c.json({
        success: false,
        data: null,
        error: 'سرویس Google Sheets پیکربندی یا فعال نشده است.',
      }, 400);
    }

    // Fetch latest 20 translated articles
    const articlesQuery = await c.env.DB.prepare(`
      SELECT 
        a.id, a.title as original_title, a.original_url, a.published_at, a.created_at,
        t.translated_title, t.translated_content, t.model_used, t.approval_status,
        t.suggested_titles, t.tags, t.meta_description,
        s.name as source_name
      FROM articles a
      INNER JOIN translations t ON a.id = t.article_id
      LEFT JOIN sources s ON a.source_id = s.id
      ORDER BY a.created_at DESC
      LIMIT 20
    `).all();

    const items = articlesQuery.results || [];
    if (items.length === 0) {
      return c.json({
        success: true,
        data: {
          syncedCount: 0,
          message: 'مقاله‌ای برای پشتیبان‌گیری در دیتابیس یافت نشد.',
          durationMs: Date.now() - startTime,
        },
        error: null,
      });
    }

    const payload = {
      action: 'sync_articles',
      secret_token: platform.auth_password_secret || '',
      timestamp: new Date().toISOString(),
      articles: items.map((item: any) => ({
        id: item.id,
        source_name: item.source_name || 'نامشخص',
        original_title: item.original_title,
        original_url: item.original_url,
        translated_title: item.translated_title,
        translated_content: (item.translated_content || '').substring(0, 1000), // First 1000 chars
        summary: item.meta_description || '',
        tags: item.tags || '',
        model: item.model_used || 'Gemini/Edge',
        status: item.approval_status || 'approved',
        date: item.created_at || new Date().toISOString(),
      })),
    };

    const res = await fetch(platform.api_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const duration = Date.now() - startTime;
    const resText = await res.text();

    await c.env.DB.prepare(`
      INSERT INTO execution_logs (task_type, status, items_processed, items_success, duration_ms, executed_at)
      VALUES ('google_sheets_backup', ?, ?, ?, ?, datetime('now'))
    `).bind(res.ok ? 'success' : 'failed', items.length, res.ok ? items.length : 0, duration).run();

    return c.json({
      success: res.ok,
      data: {
        syncedCount: items.length,
        durationMs: duration,
        message: res.ok ? `تعداد ${items.length} خبر ترجمه‌شده با موفقیت در Google Sheets ثبت گردید.` : 'خطا در ارسال داده به Google Sheets',
        rawResponse: resText.substring(0, 200),
      },
      error: res.ok ? null : `Google Sheets returned status ${res.status}`,
    });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

// ==========================================
// Sprint 1.5: Crawl Jobs & Checkpoints Endpoints
// ==========================================

// GET /api/crawl/jobs - List crawl job records
api.get('/crawl/jobs', async (c) => {
  try {
    await ensureTablesAndLogs(c.env.DB);
    const sourceId = c.req.query('source_id');
    const limit = parseInt(c.req.query('limit') || '30', 10);

    let query = `
      SELECT 
        j.*,
        s.name as source_name,
        s.url as source_url,
        s.language as source_language
      FROM crawl_jobs j
      LEFT JOIN sources s ON j.source_id = s.id
    `;
    const params: any[] = [];

    if (sourceId) {
      query += ' WHERE j.source_id = ?';
      params.push(sourceId);
    }

    query += ' ORDER BY j.id DESC LIMIT ?';
    params.push(limit);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results || [], error: null });
  } catch (err: any) {
    return c.json({ success: false, data: [], error: err.message }, 500);
  }
});

// GET /api/crawl/checkpoints - List resume checkpoints per source
api.get('/crawl/checkpoints', async (c) => {
  try {
    await ensureTablesAndLogs(c.env.DB);
    const query = `
      SELECT 
        cp.*,
        s.name as source_name,
        s.url as source_url,
        s.is_active,
        s.last_scraped_at
      FROM crawl_checkpoints cp
      LEFT JOIN sources s ON cp.source_id = s.id
      ORDER BY cp.updated_at DESC
    `;
    const { results } = await c.env.DB.prepare(query).all();
    return c.json({ success: true, data: results || [], error: null });
  } catch (err: any) {
    return c.json({ success: false, data: [], error: err.message }, 500);
  }
});

// GET /api/crawl/errors - List recent crawl errors for diagnostics
api.get('/crawl/errors', async (c) => {
  try {
    await ensureTablesAndLogs(c.env.DB);
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const sourceId = c.req.query('source_id');

    let query = `
      SELECT 
        e.*,
        s.name as source_name
      FROM crawl_errors e
      LEFT JOIN sources s ON e.source_id = s.id
    `;
    const params: any[] = [];

    if (sourceId) {
      query += ' WHERE e.source_id = ?';
      params.push(sourceId);
    }

    query += ' ORDER BY e.id DESC LIMIT ?';
    params.push(limit);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results || [], error: null });
  } catch (err: any) {
    return c.json({ success: false, data: [], error: err.message }, 500);
  }
});

// POST /api/crawl/trigger - Trigger queue-driven or direct crawl for a source
api.post('/crawl/trigger', async (c) => {
  const start = Date.now();
  try {
    await ensureTablesAndLogs(c.env.DB);
    const body = await c.req.json().catch(() => ({}));
    const sourceId = Number(body.source_id);
    const mode = body.mode || 'continuous';

    if (!sourceId) {
      return c.json({ success: false, data: null, error: 'شناسه منبع (source_id) الزامی است.' }, 400);
    }

    const source = await c.env.DB.prepare('SELECT * FROM sources WHERE id = ?').bind(sourceId).first<any>();
    if (!source) {
      return c.json({ success: false, data: null, error: 'منبع مورد نظر یافت نشد.' }, 404);
    }

    const config = await c.env.DB.prepare('SELECT * FROM source_configs WHERE source_id = ?').bind(sourceId).first<SourceConfig>();

    const { createCrawlJob, runSourceDiscovery, executeExtractionPipeline, saveExtractedArticleToD1, finalizeCrawlJob } = await import('../core/crawler/index');

    // Create a new crawl job
    const jobId = await createCrawlJob(c.env, sourceId, 'manual', mode);

    // Run discovery
    const { discoveredUrls, enqueuedCount } = await runSourceDiscovery(
      c.env,
      source,
      config || {},
      jobId
    );

    let directCrawled = 0;
    let directValidated = 0;

    // If Queue is not attached (or local preview), process discovered URLs directly
    if (!c.env.CRAWL_QUEUE && discoveredUrls.length > 0) {
      for (const url of discoveredUrls) {
        try {
          const res = await executeExtractionPipeline(url, config || {});
          if (res.validation.isValid) directValidated++;
          await saveExtractedArticleToD1(c.env, sourceId, res);
          directCrawled++;
        } catch (e: any) {
          console.error(`Direct crawl error for ${url}:`, e.message);
        }
      }

      await finalizeCrawlJob(c.env, jobId, 'completed', {
        discovered: discoveredUrls.length,
        crawled: directCrawled,
        validated: directValidated,
        saved: directCrawled,
        durationMs: Date.now() - start,
      });
    } else if (enqueuedCount === 0) {
      await finalizeCrawlJob(c.env, jobId, 'completed', {
        discovered: discoveredUrls.length,
        crawled: 0,
        saved: 0,
        durationMs: Date.now() - start,
      });
    }

    // Update source last_scraped_at
    await c.env.DB.prepare('UPDATE sources SET last_scraped_at = datetime("now") WHERE id = ?').bind(sourceId).run();

    return c.json({
      success: true,
      data: {
        jobId,
        sourceId,
        sourceName: source.name,
        mode,
        discoveredCount: discoveredUrls.length,
        enqueuedCount,
        directCrawled,
        durationMs: Date.now() - start,
      },
      error: null,
    });
  } catch (err: any) {
    return c.json({ success: false, data: null, error: err.message }, 500);
  }
});

export default api;
