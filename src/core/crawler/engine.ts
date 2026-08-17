import { Env, Source, SourceConfig } from '../../types';
import { executeExtractionPipeline, saveExtractedArticleToD1, computeUrlHash } from './index';
import { fetchUrl } from './fetcher';
import { parseHtml } from './parser';

export interface CrawlJobRecord {
  id?: number;
  source_id: number;
  trigger_type: 'cron' | 'manual' | 'api' | 'queue';
  mode: 'continuous' | 'backfill' | 'single';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  items_discovered: number;
  items_crawled: number;
  items_validated: number;
  items_rejected: number;
  items_saved: number;
  duration_ms: number;
  started_at: string;
  finished_at?: string;
}

export interface CrawlCheckpoint {
  source_id: number;
  job_id?: number;
  mode: string;
  start_date_boundary?: string;
  end_date_boundary?: string;
  last_scanned_date?: string;
  oldest_scanned_date?: string;
  current_page_number: number;
  last_etag?: string;
  last_modified_header?: string;
  consecutive_errors: number;
  health_status: 'healthy' | 'degraded' | 'failing';
  is_completed: number;
  last_crawled_at?: string;
  updated_at: string;
}

export interface CrawlQueueMessage {
  jobId: number;
  sourceId: number;
  url: string;
  urlHash: string;
  title?: string;
  pubDate?: string;
  attempt?: number;
}

/**
 * Creates a new crawl job row in D1
 */
export async function createCrawlJob(
  env: Env,
  sourceId: number,
  triggerType: 'cron' | 'manual' | 'api' | 'queue' = 'cron',
  mode: 'continuous' | 'backfill' | 'single' = 'continuous'
): Promise<number> {
  const res = await env.DB.prepare(`
    INSERT INTO crawl_jobs (
      source_id, trigger_type, mode, status,
      items_discovered, items_crawled, items_validated, items_rejected, items_saved,
      duration_ms, started_at
    ) VALUES (?, ?, ?, 'running', 0, 0, 0, 0, 0, 0, datetime('now'))
  `).bind(sourceId, triggerType, mode).run();

  const jobId = Number(res.meta.last_row_id);

  // Update checkpoint with active jobId
  await env.DB.prepare(`
    INSERT INTO crawl_checkpoints (source_id, job_id, mode, health_status, updated_at)
    VALUES (?, ?, ?, 'healthy', datetime('now'))
    ON CONFLICT(source_id) DO UPDATE SET
      job_id = excluded.job_id,
      mode = excluded.mode,
      updated_at = datetime('now')
  `).bind(sourceId, jobId, mode).run();

  return jobId;
}

/**
 * Updates crawl job metrics and final status
 */
export async function finalizeCrawlJob(
  env: Env,
  jobId: number,
  status: 'completed' | 'failed' | 'paused',
  metrics: {
    discovered?: number;
    crawled?: number;
    validated?: number;
    rejected?: number;
    saved?: number;
    durationMs?: number;
  } = {}
): Promise<void> {
  await env.DB.prepare(`
    UPDATE crawl_jobs SET
      status = ?,
      items_discovered = COALESCE(?, items_discovered),
      items_crawled = COALESCE(?, items_crawled),
      items_validated = COALESCE(?, items_validated),
      items_rejected = COALESCE(?, items_rejected),
      items_saved = COALESCE(?, items_saved),
      duration_ms = COALESCE(?, duration_ms),
      finished_at = datetime('now')
    WHERE id = ?
  `).bind(
    status,
    metrics.discovered ?? null,
    metrics.crawled ?? null,
    metrics.validated ?? null,
    metrics.rejected ?? null,
    metrics.saved ?? null,
    metrics.durationMs ?? null,
    jobId
  ).run();
}

/**
 * Logs an error into D1 crawl_errors and increments consecutive failure counter
 */
export async function logCrawlError(
  env: Env,
  sourceId: number,
  jobId: number | null,
  url: string,
  stage: 'fetch' | 'parse' | 'clean' | 'extract' | 'normalize' | 'validate' | 'store' | 'queue',
  errorType: string,
  errorMessage: string,
  retryCount: number = 0
): Promise<void> {
  try {
    await env.DB.prepare(`
      INSERT INTO crawl_errors (
        source_id, job_id, url, error_stage, error_type, error_message, retry_count, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(sourceId, jobId, url, stage, errorType, errorMessage.substring(0, 500), retryCount).run();

    // Check consecutive errors for health status update
    await env.DB.prepare(`
      UPDATE crawl_checkpoints SET
        consecutive_errors = consecutive_errors + 1,
        health_status = CASE WHEN consecutive_errors >= 5 THEN 'failing' WHEN consecutive_errors >= 2 THEN 'degraded' ELSE health_status END,
        updated_at = datetime('now')
      WHERE source_id = ?
    `).bind(sourceId).run();
  } catch (err) {
    console.error('[Hazardastan Crawler] Failed to log crawl error:', err);
  }
}

/**
 * Runs discovery stage for a single source (RSS feed or HTML directory)
 * Enqueues new articles into Cloudflare Queue (CRAWL_QUEUE) or crawls directly
 */
export async function runSourceDiscovery(
  env: Env,
  source: Source,
  config: Partial<SourceConfig>,
  jobId: number
): Promise<{ discoveredUrls: string[]; enqueuedCount: number }> {
  const targetFeedUrl = config.rss_url || source.feed_url || source.url;
  if (!targetFeedUrl) {
    return { discoveredUrls: [], enqueuedCount: 0 };
  }

  const fetchRes = await fetchUrl(targetFeedUrl, {
    timeoutMs: config.timeout_ms || 10000,
    rateLimitDelayMs: config.rate_limit_delay_ms || 500,
  });

  const discoveredItems: { url: string; title: string; pubDate?: string }[] = [];
  const limit = source.scrape_limit || 10;

  // Detect RSS/Atom vs HTML
  const isXml = fetchRes.html.includes('<rss') || fetchRes.html.includes('<feed') || fetchRes.html.includes('<?xml');

  if (isXml) {
    const $ = parseHtml(fetchRes.html);
    $('item, entry').each((_, el) => {
      if (discoveredItems.length >= limit) return;
      const $el = $(el);
      const link = $el.find('link').text().trim() || $el.find('link').attr('href')?.trim() || $el.find('guid').text().trim();
      const title = $el.find('title').text().trim();
      const pubDate = $el.find('pubDate, published, updated').text().trim();

      if (link && link.startsWith('http')) {
        discoveredItems.push({ url: link, title, pubDate });
      }
    });
  } else {
    // HTML page discovery based on article link patterns or links
    const $ = parseHtml(fetchRes.html);
    const pattern = config.article_url_pattern ? new RegExp(config.article_url_pattern) : null;

    $('a[href]').each((_, el) => {
      if (discoveredItems.length >= limit) return;
      let href = $(el).attr('href')?.trim() || '';
      if (!href) return;

      try {
        const fullUrl = new URL(href, fetchRes.finalUrl || targetFeedUrl).toString();
        if (pattern && !pattern.test(fullUrl)) return;
        if (!pattern && !fullUrl.includes('/news/') && !fullUrl.includes('/article/') && !fullUrl.includes('/post/')) return;

        const title = $(el).text().trim() || $(el).attr('title')?.trim() || '';
        if (!discoveredItems.some(i => i.url === fullUrl)) {
          discoveredItems.push({ url: fullUrl, title });
        }
      } catch {}
    });
  }

  let enqueuedCount = 0;
  const discoveredUrls: string[] = [];

  for (const item of discoveredItems) {
    const urlHash = await computeUrlHash(item.url);
    discoveredUrls.push(item.url);

    // Save/check sitemap_entries to prevent re-crawling
    const existing = await env.DB.prepare(
      'SELECT id, discovery_status FROM sitemap_entries WHERE url_hash = ?'
    ).bind(urlHash).first<{ id: number; discovery_status: string }>();

    if (!existing) {
      await env.DB.prepare(`
        INSERT INTO sitemap_entries (
          source_id, url, url_hash, discovered_title, discovered_pub_date, discovery_status, discovered_at
        ) VALUES (?, ?, ?, ?, ?, 'discovered', datetime('now'))
      `).bind(source.id, item.url, urlHash, item.title, item.pubDate || null).run();

      // Enqueue to CRAWL_QUEUE
      if (env.CRAWL_QUEUE) {
        const msg: CrawlQueueMessage = {
          jobId,
          sourceId: source.id,
          url: item.url,
          urlHash,
          title: item.title,
          pubDate: item.pubDate,
          attempt: 1,
        };
        await env.CRAWL_QUEUE.send(msg);
        enqueuedCount++;
      }
    }
  }

  // Update job metrics
  await env.DB.prepare(`
    UPDATE crawl_jobs SET
      items_discovered = items_discovered + ?
    WHERE id = ?
  `).bind(discoveredItems.length, jobId).run();

  return { discoveredUrls, enqueuedCount };
}

/**
 * Worker-agnostic Queue Consumer Processor:
 * Processes single article crawl from Queue message with retry & checkpoint handling
 */
export async function processQueueCrawlMessage(
  env: Env,
  messageBody: CrawlQueueMessage
): Promise<{ success: boolean; articleId?: number; error?: string }> {
  const { jobId, sourceId, url, urlHash } = messageBody;

  try {
    // 1. Fetch Source Config
    const config = await env.DB.prepare(
      'SELECT * FROM source_configs WHERE source_id = ?'
    ).bind(sourceId).first<SourceConfig>();

    // 2. Execute Generic Extraction Pipeline
    const pipelineResult = await executeExtractionPipeline(url, config || {});

    // 3. Save to D1 Tables (articles, blocks, images, tags)
    const { articleId } = await saveExtractedArticleToD1(env, sourceId, pipelineResult);

    // 4. Update Crawl Job progress
    const isValid = pipelineResult.validation.isValid ? 1 : 0;
    const isRejected = isValid ? 0 : 1;

    await env.DB.prepare(`
      UPDATE crawl_jobs SET
        items_crawled = items_crawled + 1,
        items_validated = items_validated + ?,
        items_rejected = items_rejected + ?,
        items_saved = items_saved + 1
      WHERE id = ?
    `).bind(isValid, isRejected, jobId).run();

    // 5. Update Checkpoint
    await env.DB.prepare(`
      UPDATE crawl_checkpoints SET
        consecutive_errors = 0,
        health_status = 'healthy',
        last_crawled_at = datetime('now'),
        updated_at = datetime('now')
      WHERE source_id = ?
    `).bind(sourceId).run();

    return { success: true, articleId };
  } catch (err: any) {
    const errorMsg = err.message || 'Unknown extraction error';
    await logCrawlError(env, sourceId, jobId, url, 'extract', 'QUEUE_CRAWL_FAILED', errorMsg, messageBody.attempt || 1);
    return { success: false, error: errorMsg };
  }
}
