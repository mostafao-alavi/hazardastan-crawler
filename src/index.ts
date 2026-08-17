import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import apiRoutes from './api/routes.ts';
import { Env, ApiResponse, ScheduledEvent, ExecutionContext, MessageBatch, Source, SourceConfig } from './types.ts';
import { 
  createCrawlJob, 
  finalizeCrawlJob, 
  runSourceDiscovery, 
  processQueueCrawlMessage, 
  CrawlQueueMessage, 
  executeExtractionPipeline, 
  saveExtractedArticleToD1 
} from './core/crawler/index.ts';

const app = new Hono<{ Bindings: Env }>();

// Security and Performance Middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// Global Error Handler
app.onError((err, c) => {
  console.error('[Hazardastan Worker] Global Error:', err);
  
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error: err.message || 'Internal Server Error',
  };

  return c.json(response, 500);
});

// Mount API routes under /api prefix ONLY
app.route('/api', apiRoutes);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'operational',
      version: '2.0.0',
      worker: 'hazardastan-crawler',
      engine: 'Hazardastan Generic Crawler Engine (Core MVP)',
      timestamp: new Date().toISOString(),
    },
    error: null,
  });
});

// Serve static assets from ./dist
app.use('/assets/*', serveStatic({ root: './' }));
app.use('/*.js', serveStatic({ root: './' }));
app.use('/*.css', serveStatic({ root: './' }));
app.use('/*.svg', serveStatic({ root: './' }));
app.use('/*.png', serveStatic({ root: './' }));
app.use('/*.ico', serveStatic({ root: './' }));
app.use('/*.json', serveStatic({ root: './' }));

// SPA Fallback
app.get('*', serveStatic({
  path: './index.html',
  rewriteRequestPath: () => './index.html',
}));

// Cloudflare Worker export with fetch, scheduled, and queue handlers
export default {
  fetch: app.fetch,

  // Scheduled event handler for Cloudflare Cron Triggers (crons = ["*/15 * * * *"])
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Hazardastan Cron] 15-Minute trigger executed at ${new Date().toISOString()} (Cron: ${event.cron})`);

    ctx.waitUntil(
      (async () => {
        const startTime = Date.now();
        try {
          // 1. Fetch active sources from D1
          const { results: activeSources } = await env.DB.prepare(
            'SELECT * FROM sources WHERE is_active = 1'
          ).all<Source>();

          if (!activeSources || activeSources.length === 0) {
            console.log('[Hazardastan Cron] No active sources found.');
            return;
          }

          console.log(`[Hazardastan Cron] Starting automated discovery for ${activeSources.length} active sources...`);

          for (const source of activeSources) {
            try {
              // 2. Fetch source config
              const config = await env.DB.prepare(
                'SELECT * FROM source_configs WHERE source_id = ?'
              ).bind(source.id).first<SourceConfig>();

              // 3. Create a Crawl Job record
              const jobId = await createCrawlJob(env, source.id, 'cron', 'continuous');

              // 4. Run Discovery & Enqueue to Cloudflare Queue
              const { discoveredUrls, enqueuedCount } = await runSourceDiscovery(
                env,
                source,
                config || {},
                jobId
              );

              // If Queue is not available in local environment, crawl directly as fallback
              if (!env.CRAWL_QUEUE && discoveredUrls.length > 0) {
                let savedCount = 0;
                let validatedCount = 0;
                for (const url of discoveredUrls) {
                  try {
                    const result = await executeExtractionPipeline(url, config || {});
                    if (result.validation.isValid) validatedCount++;
                    await saveExtractedArticleToD1(env, source.id, result);
                    savedCount++;
                  } catch (e: any) {
                    console.error(`[Hazardastan Cron] Fallback direct crawl error for ${url}:`, e.message);
                  }
                }
                await finalizeCrawlJob(env, jobId, 'completed', {
                  discovered: discoveredUrls.length,
                  crawled: savedCount,
                  validated: validatedCount,
                  saved: savedCount,
                  durationMs: Date.now() - startTime,
                });
              } else if (enqueuedCount === 0) {
                // No new items discovered
                await finalizeCrawlJob(env, jobId, 'completed', {
                  discovered: discoveredUrls.length,
                  crawled: 0,
                  saved: 0,
                  durationMs: Date.now() - startTime,
                });
              }

              // Update source last_scraped_at
              await env.DB.prepare('UPDATE sources SET last_scraped_at = datetime("now") WHERE id = ?')
                .bind(source.id)
                .run();
            } catch (srcErr: any) {
              console.error(`[Hazardastan Cron] Error processing source ${source.name}:`, srcErr.message);
            }
          }

          console.log('[Hazardastan Cron] Automated discovery and dispatch completed.');
        } catch (err: any) {
          console.error('[Hazardastan Cron] Fatal error during scheduled execution:', err);
        }
      })()
    );
  },

  // Queue consumer handler for Cloudflare Queues (CRAWL_QUEUE)
  async queue(batch: MessageBatch<CrawlQueueMessage>, env: Env): Promise<void> {
    console.log(`[Hazardastan Queue] Processing batch of ${batch.messages.length} messages for queue: ${batch.queue}`);

    for (const message of batch.messages) {
      try {
        const { success, error } = await processQueueCrawlMessage(env, message.body);
        if (success) {
          message.ack();
        } else {
          console.warn(`[Hazardastan Queue] Retrying message for URL: ${message.body.url}. Reason: ${error}`);
          message.retry();
        }
      } catch (msgErr: any) {
        console.error(`[Hazardastan Queue] Unexpected consumer error:`, msgErr);
        message.retry();
      }
    }
  },
};
