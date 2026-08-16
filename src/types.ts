/**
 * Type definitions for Hazardastan Crawler Engine Core Platform
 */

// 1. Sources & Source Configurations
export interface Source {
  id?: number;
  name: string;
  slug?: string;
  base_url?: string;
  feed_url?: string;
  url?: string;
  rss_url?: string;
  selector?: string;
  source_type?: 'rss' | 'atom' | 'sitemap' | 'html_listing' | string;
  category?: string;
  language?: string;
  fetch_interval_min?: number;
  scrape_limit?: number;
  is_active?: boolean | number;
  last_scraped_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SourceConfig {
  source_id: number;
  discovery_type?: 'rss' | 'sitemap' | 'html_listing' | 'hybrid' | string;
  sitemap_url?: string | null;
  rss_url?: string | null;
  article_url_pattern?: string | null;
  request_headers?: string | Record<string, string> | null;
  rate_limit_delay_ms?: number;
  max_concurrency?: number;
  timeout_ms?: number;
  title_selector?: string | null;
  subtitle_selector?: string | null;
  summary_selector?: string | null;
  author_selector?: string | null;
  published_date_selector?: string | null;
  content_selector?: string;
  tags_selector?: string | null;
  featured_image_selector?: string | null;
  article_images_selector?: string | null;
  remove_selectors?: string | string[] | null;
  cleaning_rules?: string | Record<string, any> | null;
  updated_at?: string;
}

// 2. Crawl Jobs & Checkpoints
export interface CrawlJob {
  id?: number;
  source_id?: number | null;
  trigger_type: 'cron' | 'manual' | string;
  mode?: 'historical' | 'continuous' | 'backward' | 'backward_all' | string;
  status: 'running' | 'completed' | 'failed' | 'partial' | string;
  items_discovered?: number;
  items_crawled?: number;
  items_validated?: number;
  items_rejected?: number;
  items_saved?: number;
  duration_ms?: number;
  started_at?: string;
  finished_at?: string | null;
}

export interface CrawlCheckpoint {
  source_id: number;
  job_id?: number | null;
  mode: 'historical' | 'continuous' | 'backward' | 'backward_all' | string;
  start_date_boundary?: string | null;
  end_date_boundary?: string | null;
  last_scanned_date?: string | null;
  oldest_scanned_date?: string | null;
  current_page_number?: number;
  last_etag?: string | null;
  last_modified_header?: string | null;
  consecutive_errors?: number;
  health_status?: 'healthy' | 'warning' | 'failing' | 'disabled' | string;
  is_completed?: number;
  last_crawled_at?: string | null;
  updated_at?: string;
}

// 3. Sitemap & Discovery Entries
export interface SitemapEntry {
  id?: number;
  source_id: number;
  url: string;
  url_hash: string;
  discovered_title?: string | null;
  discovered_pub_date?: string | null;
  discovery_status: 'discovered' | 'queued' | 'crawled' | 'skipped_old' | 'skipped_error' | string;
  discovered_at?: string;
  crawled_at?: string | null;
}

// 4. Articles & Structured Content
export interface Article {
  id?: number;
  source_id: number;
  external_id?: string;
  original_url?: string;
  link?: string;
  url_hash?: string;
  title: string;
  summary?: string;
  content?: string;
  cleaned_content?: string;
  plain_text?: string;
  raw_excerpt?: string | null;
  author?: string | null;
  featured_image?: string | null;
  language?: string;
  word_count?: number;
  reading_time_min?: number;
  published_at: string;
  scraped_at?: string;
  crawled_at?: string;
  created_at?: string;
  status?: string;
  translation_status?: string;
  wp_sync_status?: string | null;
  wp_post_id?: number | null;
  wp_published_at?: string | null;
  wp_error?: string | null;
  validation_status?: 'valid' | 'rejected' | string;
  rejection_reason?: string | null;
  sheets_backup_status?: 'pending' | 'synced' | 'failed' | string;
  sheets_backup_at?: string | null;
  source_name?: string;
}

// 5. Content Blocks & Images
export interface ArticleBlock {
  id?: number;
  article_id: number;
  order_index: number;
  block_type: 'paragraph' | 'heading' | 'image' | 'quote' | 'list' | string;
  content_text?: string | null;
  content_html?: string | null;
  media_url?: string | null;
  media_caption?: string | null;
  media_alt?: string | null;
  block_meta?: string | Record<string, any> | null;
  created_at?: string;
}

export interface ArticleImageItem {
  id?: number;
  article_id: number;
  url: string;
  original_url: string;
  alt_text?: string | null;
  title?: string | null;
  caption?: string | null;
  description?: string | null;
  width?: number | null;
  height?: number | null;
  position: number;
  role: 'featured' | 'content' | 'advertisement' | 'unknown' | string;
  created_at?: string;
}

// 6. Tags
export interface Tag {
  id?: number;
  name: string;
  slug: string;
}

// 7. Crawl Errors & Observability
export interface CrawlError {
  id?: number;
  job_id?: number | null;
  source_id?: number | null;
  article_url?: string | null;
  stage: 'discovery' | 'fetch' | 'extract' | 'clean' | 'validate' | 'backup' | string;
  error_type: string;
  http_status?: number | null;
  error_message: string;
  occurred_at?: string;
  source_name?: string | null;
}

// 8. Google Sheets & Backup Destinations
export interface BackupDestination {
  id?: number;
  name: string;
  destination_type: 'google_sheets' | string;
  endpoint_url: string;
  secret_token?: string | null;
  sheet_name?: string;
  auto_backup?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BackupRun {
  id?: number;
  destination_id: number;
  job_id?: number | null;
  status: 'success' | 'failed' | string;
  items_synced?: number;
  latency_ms?: number;
  response_summary?: string | null;
  executed_at?: string;
}

// Legacy Archive Types (for non-runtime compatibility)
export interface SeoMetadata {
  suggested_titles: string[];
  tags: string[];
  meta_description: string;
}

export interface JoinedArticleNews {
  id: number;
  source_id: number;
  source_name: string;
  original_url: string;
  title: string;
  content?: string | null;
  featured_image?: string | null;
  published_at: string;
  created_at: string;
  translation_status: string;
  wp_sync_status?: 'pending' | 'syncing' | 'published' | 'failed' | null;
  wp_post_id?: number | null;
  wp_published_at?: string | null;
  wp_error?: string | null;
  translated_title: string | null;
  translated_content?: string | null;
  suggested_titles?: string[] | string | null;
  tags?: string[] | string | null;
  meta_description?: string | null;
  translated_at: string | null;
  model_used?: string | null;
}

export interface Translation {
  id?: number;
  article_id: number;
  target_language?: string;
  translated_title: string;
  translated_content: string;
  translated_summary?: string | null;
  suggested_titles?: string[] | string | null;
  tags?: string[] | string | null;
  meta_description?: string | null;
  translated_at?: string;
  ai_model?: string;
  model_used?: string;
  approval_status?: 'pending' | 'approved' | 'rejected' | string;
}

export interface Platform {
  id?: number;
  name: string;
  slug: string;
  platform_type: 'wordpress' | 'webhook' | 'rest_api' | 'telegram' | 'bale' | string;
  api_url: string;
  auth_username?: string | null;
  auth_password_secret?: string | null;
  is_active?: boolean | number;
  created_at?: string;
}

export interface JoinedDistribution {
  id: number;
  translation_id: number;
  target_platform: string;
  author_name: string | null;
  platform_post_id: string | null;
  published_at: string;
  article_id: number;
  translated_title: string;
  translated_content?: string | null;
  original_title?: string | null;
  source_name?: string | null;
  original_url?: string | null;
}

// API Responses
export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface StatsData {
  sources_count: number;
  articles_count: number;
  crawled_today_count?: number;
  success_rate_percentage?: number;
  avg_latency_ms?: number;
  sheets_synced_count?: number;
  active_jobs_count?: number;
  errors_count?: number;
  translations_count?: number;
  pending_translations_count?: number;
  approved_translations_count?: number;
  wp_published_count?: number;
  distributions_count?: number;
  platforms_count?: number;
}

// Ambient Cloudflare Worker Types
export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; meta: any }>;
  run(): Promise<{ meta: { changes: number; last_row_id: number | string } }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<{ results?: T[]; meta: { changes: number; last_row_id?: number | string } }[]>;
  exec(query: string): Promise<{ success: boolean }>;
}

export interface KVNamespace {
  get(key: string, options?: any): Promise<string | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: any): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}

export interface QueueMessage<T = any> {
  id: string;
  timestamp: Date;
  body: T;
  ack(): void;
  retry(): void;
}

export interface MessageBatch<T = any> {
  queue: string;
  messages: QueueMessage<T>[];
  ackAll(): void;
  retryAll(): void;
}

export interface Queue<T = any> {
  send(message: T, options?: any): Promise<void>;
  sendBatch(messages: { body: T }[], options?: any): Promise<void>;
}

export interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
  type: string;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// Clean Cloudflare Workers Environment bindings for Hazardastan Core
export interface Env {
  DB: D1Database;
  CACHE?: KVNamespace;
  CRAWL_QUEUE?: Queue;
  ENVIRONMENT?: string;
  ADMIN_SECRET?: string;
  GOOGLE_SHEETS_WEBAPP_URL?: string;
  // Deprecated legacy bindings for archive assets
  DB_ARCHIVE?: D1Database;
  AI?: any;
  SCRAPE_QUEUE?: Queue;
  TRANSLATE_QUEUE?: Queue;
  GEMINI_API_KEY?: string;
  WP_API_URL?: string;
  WP_USERNAME?: string;
  WP_APPLICATION_PASSWORD?: string;
  WP_POST_STATUS?: string;
  WP_CATEGORY_ID?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}
