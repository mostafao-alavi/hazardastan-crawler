import { CheerioRoot } from './parser';

export interface CleaningOptions {
  removeSelectors?: string[];
  stripEmptyParagraphs?: boolean;
  stripInlineStyles?: boolean;
  stripClassAttributes?: boolean;
  convertRelativeUrls?: boolean;
  baseUrl?: string;
}

const DEFAULT_REMOVE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'object',
  'embed',
  'svg',
  'canvas',
  '.advertisement',
  '.ads',
  '.ad-banner',
  '.ad-container',
  '.social-share',
  '.share-buttons',
  '.social-links',
  '.newsletter-signup',
  '.subscribe-box',
  '.related-posts',
  '.recommended-articles',
  '.comments',
  '#comments',
  '.disclaimer',
  '.cookie-banner',
  '.popup',
  '.modal',
  '[aria-hidden="true"]',
];

/**
 * Cleans the DOM tree based on declared cleaning configuration
 */
export function cleanDom(
  $: CheerioRoot,
  containerSelector: string,
  options: CleaningOptions = {}
): CheerioRoot {
  const container = $(containerSelector);
  if (!container.length) {
    return $;
  }

  // 1. Remove unwanted selectors
  const selectorsToRemove = [
    ...DEFAULT_REMOVE_SELECTORS,
    ...(options.removeSelectors || []),
  ];

  selectorsToRemove.forEach((sel) => {
    if (sel && sel.trim()) {
      try {
        container.find(sel).remove();
      } catch (e) {
        // Ignore malformed custom CSS selectors
      }
    }
  });

  // 2. Remove HTML comments
  container.contents().each(function () {
    if (this.type === 'comment') {
      $(this).remove();
    }
  });

  // 3. Resolve relative URLs to absolute if baseUrl is provided
  if (options.convertRelativeUrls && options.baseUrl) {
    const base = options.baseUrl;
    container.find('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) {
        try {
          $(el).attr('href', new URL(href, base).toString());
        } catch (e) {
          // Ignore invalid URL resolution
        }
      }
    });

    container.find('img[src], img[data-src]').each((_, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        try {
          const absolute = new URL(src, base).toString();
          $(el).attr('src', absolute);
        } catch (e) {
          // Ignore invalid URL resolution
        }
      }
    });
  }

  // 4. Strip dangerous or clutter attributes (inline styles, event handlers)
  if (options.stripInlineStyles) {
    container.find('*').removeAttr('style');
  }

  container.find('*').each((_, el) => {
    const attribs = el.attribs || {};
    Object.keys(attribs).forEach((attr) => {
      if (attr.startsWith('on') || attr.startsWith('data-tracking') || attr.startsWith('data-analytics')) {
        $(el).removeAttr(attr);
      }
    });
  });

  // 5. Strip empty paragraphs
  if (options.stripEmptyParagraphs !== false) {
    container.find('p, span, div').each((_, el) => {
      const text = $(el).text().trim();
      const hasImages = $(el).find('img').length > 0;
      if (!text && !hasImages && $(el).children().length === 0) {
        $(el).remove();
      }
    });
  }

  return $;
}
