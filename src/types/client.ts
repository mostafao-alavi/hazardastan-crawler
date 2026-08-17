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
  translation_status: 'pending' | 'processing' | 'completed' | 'failed';
  translated_title: string | null;
  translated_content?: string | null;
  suggested_titles?: string[] | string | null;
  tags?: string[] | string | null;
  meta_description?: string | null;
  translated_at: string | null;
  model_used?: string | null;
}

export interface SourceItem {
  id: number;
  name: string;
  url: string;
  language: string;
  category?: string;
  selector?: string;
  scrape_limit?: number;
  is_active?: boolean | number;
  created_at?: string;
}

export interface PlatformItem {
  id: number;
  name: string;
  slug: string;
  platform_type: 'wordpress' | 'webhook' | 'rest_api' | 'telegram' | 'bale';
  api_url: string;
  auth_username?: string | null;
  auth_password_secret?: string | null;
  is_active: boolean | number;
  created_at?: string;
}

export interface StatsData {
  sources_count: number;
  articles_count: number;
  translations_count: number;
  pending_translations_count: number;
  approved_translations_count?: number;
  wp_published_count?: number;
  distributions_count?: number;
  platforms_count?: number;
}

export interface DistributionItem {
  id: number;
  translation_id: number;
  target_platform: string;
  author_name: string | null;
  platform_post_id: string | null;
  published_at: string;
  article_id?: number;
  translated_title?: string;
  translated_content?: string;
  original_title?: string;
  source_name?: string;
  original_url?: string;
}

export interface AuthStatusInfo {
  authenticated: boolean;
  user_email: string | null;
  zero_trust: boolean;
  ip: string | null;
  auth_method: string;
  access_granted: boolean;
}

export interface DbStatusInfo {
  engine: string;
  status: string;
  ping_ms: number;
  sources_count: number;
  articles_count: number;
  translations_count: number;
  pending_count: number;
  last_sync: string;
}

export interface ExecutionLogItem {
  id: number;
  task_type: 'cron_scraper' | 'cron_translator' | 'manual_scraper' | 'manual_translator' | string;
  status: 'success' | 'failed' | 'partial' | string;
  items_processed: number;
  items_success: number;
  error_message: string | null;
  duration_ms: number;
  executed_at: string;
}

export interface SystemEventItem {
  id: number;
  event_type: string;
  description: string;
  created_at: string;
}

export interface TranslationHistoryItem {
  id: number;
  article_id: number;
  target_language: string;
  translated_title: string;
  translated_content: string;
  translated_at: string;
  model_used: string;
}

export interface WorkerFileInfo {
  filename: string;
  language: string;
  path: string;
}

// Wireframe v2 - Crawler Operations Control Center Types
export type PipelineStageType = 'source' | 'fetch' | 'parse' | 'clean' | 'extract' | 'normalize' | 'store' | 'backup';
export type StageStatusType = 'completed' | 'active' | 'pending' | 'idle' | 'failed';

export interface PipelineStageItem {
  id: PipelineStageType;
  label: string;
  status: StageStatusType;
  details: string;
  duration_ms?: number;
  items_count?: number;
}

export interface EngineHealthInfo {
  status: 'running' | 'healthy' | 'idle' | 'warning' | 'paused';
  status_label: string;
  last_successful_crawl: string;
  current_job: string;
  processing_rate: string;
  runtime: string;
  worker_name: string;
  region: string;
  active_concurrency: number;
}

export interface QueueCenterInfo {
  queue_name: string;
  pending: number;
  processing: number;
  failed: number;
  completed_today: number;
  success_rate: string;
}

export interface SourceHealthStatus {
  id: number;
  name: string;
  url: string;
  status: 'healthy' | 'warning' | 'error';
  last_crawl: string;
  latency_ms: number;
  category?: string;
  error_message?: string;
}

export interface ActivityTimelineItem {
  id: string | number;
  time: string;
  title: string;
  description?: string;
  type: 'crawler' | 'extract' | 'ai' | 'backup' | 'publish' | 'system' | 'queue';
  status: 'success' | 'warning' | 'error' | 'info';
}

export interface CrawlerOperationsData {
  engine: EngineHealthInfo;
  pipeline: PipelineStageItem[];
  metrics: {
    sources_count: number;
    active_sources_count: number;
    jobs_count: number;
    articles_count: number;
    errors_count: number;
  };
  queue: QueueCenterInfo;
  source_health: SourceHealthStatus[];
  activity_stream: ActivityTimelineItem[];
  error_center: {
    failed_jobs_count: number;
    recent_errors: Array<{
      id: number;
      job_id?: number;
      source_name?: string;
      error_message: string;
      time: string;
    }>;
  };
}
