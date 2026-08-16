import * as cheerio from 'cheerio';

export type CheerioRoot = ReturnType<typeof cheerio.load>;

/**
 * Parses raw HTML string into a queryable Cheerio DOM instance
 */
export function parseHtml(html: string): CheerioRoot {
  if (!html || typeof html !== 'string') {
    throw new Error('HTML content is empty or invalid');
  }

  // Load with XML mode false to handle HTML5 quirks gracefully
  return cheerio.load(html, {
    xml: false,
  });
}
