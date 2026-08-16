export interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
  rateLimitDelayMs?: number;
}

export interface FetchResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  html: string;
  contentType: string;
  latencyMs: number;
}

const DEFAULT_USER_AGENT = 'HazardastanBot/2.0 (+https://hazardastan.com/bot; Generic News Crawler)';

/**
 * Robust HTTP fetcher with timeout, retry, and rate limit handling
 */
export async function fetchUrl(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs || 10000;
  const maxRetries = options.maxRetries || 2;
  const headers: Record<string, string> = {
    'User-Agent': options.headers?.['User-Agent'] || DEFAULT_USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,fa;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...(options.headers || {})
  };

  let lastError: any = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (options.rateLimitDelayMs && options.rateLimitDelayMs > 0) {
        await new Promise((r) => setTimeout(r, options.rateLimitDelayMs));
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;

      if (!response.ok && response.status >= 500 && attempt <= maxRetries) {
        // Retry on 5xx server errors
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }

      const contentType = response.headers.get('content-type') || 'text/html';
      const html = await response.text();

      return {
        url,
        finalUrl: response.url || url,
        statusCode: response.status,
        html,
        contentType,
        latencyMs,
      };
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      if (err.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeoutMs}ms for ${url}`);
      }
      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url}`);
}
