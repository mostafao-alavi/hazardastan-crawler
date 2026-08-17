import { fetchUrl, FetchOptions, FetchResult } from './fetcher';
import { parseHtml } from './parser';
import { cleanDom, CleaningOptions } from './cleaner';
import { extractArticleMetadata, ExtractedRawData } from './extractor';
import { normalizeContentBlocks, NormalizedArticleResult } from './normalizer';
import { validateArticle, ValidationResult } from './validator';
import { SourceConfig, Article, ArticleBlock, ArticleImageItem, Env } from '../../types';

export * from './fetcher';
export * from './parser';
export * from './cleaner';
export * from './extractor';
export * from './normalizer';
export * from './validator';
export * from './engine';

export interface PipelineResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  latencyMs: number;
  metadata: ExtractedRawData;
  normalized: NormalizedArticleResult;
  validation: ValidationResult;
  extractedAt: string;
}

/**
 * Executes the complete end-to-end Generic Extraction Pipeline on any web article
 */
export async function executeExtractionPipeline(
  url: string,
  config: Partial<SourceConfig> = {},
  fetchOpts: FetchOptions = {}
): Promise<PipelineResult> {
  // Parse cleaning rules from config if stored as JSON string
  let cleaningRules: Record<string, any> = {};
  if (typeof config.cleaning_rules === 'string') {
    try {
      cleaningRules = JSON.parse(config.cleaning_rules);
    } catch (e) {}
  } else if (config.cleaning_rules) {
    cleaningRules = config.cleaning_rules;
  }

  let removeSelectors: string[] = [];
  if (typeof config.remove_selectors === 'string') {
    try {
      removeSelectors = JSON.parse(config.remove_selectors);
    } catch (e) {}
  } else if (Array.isArray(config.remove_selectors)) {
    removeSelectors = config.remove_selectors;
  }

  // 1. Fetch
  const customHeaders: Record<string, string> = {};
  if (typeof config.request_headers === 'string') {
    try {
      Object.assign(customHeaders, JSON.parse(config.request_headers));
    } catch (e) {}
  } else if (config.request_headers) {
    Object.assign(customHeaders, config.request_headers);
  }

  const fetchRes: FetchResult = await fetchUrl(url, {
    headers: customHeaders,
    timeoutMs: config.timeout_ms || fetchOpts.timeoutMs || 10000,
    rateLimitDelayMs: config.rate_limit_delay_ms || fetchOpts.rateLimitDelayMs || 0,
    ...fetchOpts,
  });

  // 2. Parse
  const $ = parseHtml(fetchRes.html);

  // 3. Clean
  cleanDom($, config.content_selector || 'article', {
    removeSelectors,
    stripEmptyParagraphs: cleaningRules.strip_empty_paragraphs !== false,
    stripInlineStyles: cleaningRules.strip_inline_styles !== false,
    stripClassAttributes: cleaningRules.strip_class_attributes !== false,
    convertRelativeUrls: cleaningRules.convert_relative_urls_to_absolute !== false,
    baseUrl: fetchRes.finalUrl || url,
  });

  // 4. Extract
  const metadata = extractArticleMetadata($, config, fetchRes.finalUrl || url);

  // 5. Normalize Blocks and Images
  const normalized = normalizeContentBlocks(
    metadata.contentHtml,
    fetchRes.finalUrl || url,
    metadata.featuredImage
  );

  // 6. Validate
  const validation = validateArticle(metadata, normalized, {
    minWordCount: cleaningRules.min_word_count || 30,
    minContentLength: cleaningRules.min_content_length || 100,
  });

  return {
    url,
    finalUrl: fetchRes.finalUrl,
    statusCode: fetchRes.statusCode,
    latencyMs: fetchRes.latencyMs,
    metadata,
    normalized,
    validation,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Computes deterministic SHA-256 hash in string format (cross-platform)
 */
export async function computeUrlHash(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Persists the extracted structured article, blocks, images, and tags into D1 Core Tables
 */
export async function saveExtractedArticleToD1(
  env: Env,
  sourceId: number,
  pipelineResult: PipelineResult
): Promise<{ articleId: number; changes: number }> {
  const { url, metadata, normalized, validation } = pipelineResult;
  const urlHash = await computeUrlHash(url);

  // 1. Check if article already exists
  const existing = await env.DB.prepare(
    'SELECT id FROM articles WHERE url_hash = ? OR original_url = ?'
  )
    .bind(urlHash, url)
    .first<{ id: number }>();

  let articleId: number;

  if (existing && existing.id) {
    articleId = existing.id;
    await env.DB.prepare(`
      UPDATE articles SET
        title = ?,
        cleaned_content = ?,
        plain_text = ?,
        raw_excerpt = ?,
        author = ?,
        featured_image = ?,
        word_count = ?,
        reading_time_min = ?,
        published_at = ?,
        crawled_at = datetime('now'),
        validation_status = ?,
        rejection_reason = ?
      WHERE id = ?
    `)
      .bind(
        metadata.title,
        normalized.cleanedHtml,
        normalized.plainText,
        metadata.summary,
        metadata.author,
        metadata.featuredImage,
        normalized.wordCount,
        normalized.readingTimeMin,
        metadata.publishedAt,
        validation.status,
        validation.rejectionReason,
        articleId
      )
      .run();

    // Clean old blocks & images to avoid duplicates on re-crawl
    await env.DB.prepare('DELETE FROM article_blocks WHERE article_id = ?').bind(articleId).run();
    await env.DB.prepare('DELETE FROM article_images WHERE article_id = ?').bind(articleId).run();
  } else {
    const insertRes = await env.DB.prepare(`
      INSERT INTO articles (
        source_id, original_url, url_hash, title, cleaned_content, plain_text,
        raw_excerpt, author, featured_image, word_count, reading_time_min,
        published_at, crawled_at, validation_status, rejection_reason, sheets_backup_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, 'pending')
    `)
      .bind(
        sourceId,
        url,
        urlHash,
        metadata.title,
        normalized.cleanedHtml,
        normalized.plainText,
        metadata.summary,
        metadata.author,
        metadata.featuredImage,
        normalized.wordCount,
        normalized.readingTimeMin,
        metadata.publishedAt,
        validation.status,
        validation.rejectionReason
      )
      .run();

    articleId = Number(insertRes.meta.last_row_id);
  }

  // 2. Insert Article Blocks sequentially
  for (const block of normalized.blocks) {
    await env.DB.prepare(`
      INSERT INTO article_blocks (
        article_id, order_index, block_type, content_text, content_html,
        media_url, media_caption, media_alt, block_meta, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
      .bind(
        articleId,
        block.order_index,
        block.block_type,
        block.content_text || null,
        block.content_html || null,
        block.media_url || null,
        block.media_caption || null,
        block.media_alt || null,
        typeof block.block_meta === 'object' ? JSON.stringify(block.block_meta) : (block.block_meta || null)
      )
      .run();
  }

  // 3. Insert Article Images metadata
  for (const img of normalized.images) {
    await env.DB.prepare(`
      INSERT INTO article_images (
        article_id, url, original_url, alt_text, title, caption,
        description, width, height, position, role, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
      .bind(
        articleId,
        img.url,
        img.original_url || img.url,
        img.alt_text || null,
        img.title || null,
        img.caption || null,
        img.description || null,
        img.width || null,
        img.height || null,
        img.position || 1,
        img.role || 'content'
      )
      .run();
  }

  // 4. Insert Tags
  if (metadata.tags && metadata.tags.length > 0) {
    for (const tag of metadata.tags) {
      const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (slug) {
        await env.DB.prepare('INSERT OR IGNORE INTO tags (name, slug) VALUES (?, ?)').bind(tag, slug).run();
        const tagRecord = await env.DB.prepare('SELECT id FROM tags WHERE slug = ?').bind(slug).first<{ id: number }>();
        if (tagRecord && tagRecord.id) {
          await env.DB.prepare('INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)')
            .bind(articleId, tagRecord.id)
            .run();
        }
      }
    }
  }

  // 5. Update Sitemap status if entry exists
  await env.DB.prepare(`
    UPDATE sitemap_entries
    SET discovery_status = 'crawled', crawled_at = datetime('now')
    WHERE url_hash = ?
  `)
    .bind(urlHash)
    .run();

  return { articleId, changes: normalized.blocks.length + normalized.images.length };
}
