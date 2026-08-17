import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import apiRoutes from './api/routes.ts';
import { scrapeCointelegraph, scrapeFullArticle, saveArticle } from './cron/scraper.ts';
import { Env, ApiResponse, ScheduledEvent, ExecutionContext, MessageBatch } from './types.ts';

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

// Mount API routes under /api/v1 (Standard) and /api (Compatibility Alias)
app.route('/api/v1', apiRoutes);
app.route('/api', apiRoutes);

// Health check endpoint (GET /health)
app.get('/health', (c) => {
  const hasDb = Boolean(c.env?.DB);
  const hasCache = Boolean(c.env?.CACHE);
  const hasQueue = Boolean(c.env?.CRAWL_QUEUE);
  return c.json({
    status: 'ok',
    service: 'hazardastan-crawler',
    environment: c.env?.ENVIRONMENT || 'production',
    timestamp: new Date().toISOString(),
    bindings: {
      database: hasDb,
      cache: hasCache,
      queue: hasQueue,
    },
  }, 200);
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
        try {
          // 1. Run Discovery on active sources
          console.log('[Hazardastan Cron] Starting automated discovery & crawl pipeline...');
          const articles = await scrapeCointelegraph(env);
          console.log(`[Hazardastan Cron] Discovered ${articles.length} candidates for crawl`);

          for (const article of articles) {
            try {
              // 2. Fetch full article and extract blocks & images
              const link = article.link || '';
              if (!link) continue;

              const fullContent = await scrapeFullArticle(env, link);

              // 3. Save to D1 Primary (articles, article_blocks, article_images)
              if (fullContent && fullContent.full_text) {
                await saveArticle(
                  env, 
                  {
                    source_id: article.source_id || 1,
                    title: article.title || '',
                    link: link,
                    summary: article.summary || '',
                    published_at: article.published_at || new Date().toISOString(),
                    featured_image: article.featured_image
                  }, 
                  fullContent, 
                  fullContent.images
                );
              }
            } catch (itemErr: any) {
              console.error(`[Hazardastan Cron] Error processing candidate ${article.link}:`, itemErr.message);
            }
          }

          console.log('[Hazardastan Cron] Scheduled crawl completed successfully.');
        } catch (err: any) {
          console.error('[Hazardastan Cron] Fatal error during scheduled execution:', err);
        }
      })()
    );
  },

  // Queue consumer handler for Cloudflare Queues (CRAWL_QUEUE)
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    console.log(`[Hazardastan Queue] Processing batch of ${batch.messages.length} messages for queue: ${batch.queue}`);

    for (const message of batch.messages) {
      try {
        const { url, source_id, title } = message.body || {};
        if (url) {
          const fullContent = await scrapeFullArticle(env, url);
          if (fullContent.full_text) {
            await saveArticle(
              env, 
              { 
                source_id: source_id || 1, 
                title: title || '', 
                link: url, 
                published_at: new Date().toISOString() 
              }, 
              fullContent, 
              fullContent.images
            );
          }
        }
        message.ack();
      } catch (msgErr: any) {
        console.error(`[Hazardastan Queue] Error processing message:`, msgErr);
        message.retry();
      }
    }
  },
};
