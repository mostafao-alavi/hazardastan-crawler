import { CheerioRoot } from './parser';
import { SourceConfig } from '../../types';

export interface ExtractedRawData {
  title: string;
  author: string;
  publishedAt: string;
  summary: string;
  tags: string[];
  featuredImage: string;
  contentSelectorUsed: string;
  contentHtml: string;
}

/**
 * Robust extraction engine with multi-tiered fallback cascades
 */
export function extractArticleMetadata(
  $: CheerioRoot,
  config: Partial<SourceConfig> = {},
  pageUrl: string = ''
): ExtractedRawData {
  // 1. Extract Title
  let title = '';
  if (config.title_selector) {
    title = $(config.title_selector).first().text().trim();
  }
  if (!title) {
    title = $('meta[property="og:title"]').attr('content')?.trim() || '';
  }
  if (!title) {
    title = $('meta[name="twitter:title"]').attr('content')?.trim() || '';
  }
  if (!title) {
    title = $('h1').first().text().trim();
  }
  if (!title) {
    title = $('title').text().split('|')[0].split('-')[0].trim();
  }

  // 2. Extract Author
  let author = '';
  if (config.author_selector) {
    author = $(config.author_selector).first().text().trim();
  }
  if (!author) {
    author = $('meta[name="author"]').attr('content')?.trim() || '';
  }
  if (!author) {
    author = $('meta[property="article:author"]').attr('content')?.trim() || '';
  }
  if (!author) {
    author = $('[rel="author"], .author, .byline, .author-name, .article-author').first().text().trim();
  }
  if (!author) {
    author = 'Editorial Staff';
  }

  // 3. Extract Published Date
  let publishedAt = '';
  if (config.published_date_selector) {
    const el = $(config.published_date_selector).first();
    publishedAt = el.attr('datetime') || el.attr('content') || el.text().trim();
  }
  if (!publishedAt) {
    publishedAt = $('meta[property="article:published_time"]').attr('content')?.trim() || '';
  }
  if (!publishedAt) {
    publishedAt = $('time[datetime]').first().attr('datetime')?.trim() || '';
  }
  if (!publishedAt) {
    publishedAt = $('meta[name="pubdate"], meta[name="publish-date"], meta[name="date"]').attr('content')?.trim() || '';
  }
  if (!publishedAt) {
    publishedAt = $('time').first().text().trim() || '';
  }

  // Format / parse Date to ISO standard if possible
  try {
    const parsedDate = new Date(publishedAt);
    if (!isNaN(parsedDate.getTime())) {
      publishedAt = parsedDate.toISOString();
    } else {
      publishedAt = new Date().toISOString();
    }
  } catch (e) {
    publishedAt = new Date().toISOString();
  }

  // 4. Extract Summary / Excerpt
  let summary = '';
  if (config.summary_selector) {
    summary = $(config.summary_selector).first().text().trim();
  }
  if (!summary) {
    summary = $('meta[property="og:description"]').attr('content')?.trim() || '';
  }
  if (!summary) {
    summary = $('meta[name="description"]').attr('content')?.trim() || '';
  }

  // 5. Extract Tags
  const tagsSet = new Set<string>();
  if (config.tags_selector) {
    $(config.tags_selector).each((_, el) => {
      const tagText = $(el).text().trim().replace(/^#/, '');
      if (tagText && tagText.length < 50) tagsSet.add(tagText);
    });
  }
  if (tagsSet.size === 0) {
    const keywords = $('meta[name="keywords"]').attr('content');
    if (keywords) {
      keywords.split(',').map(k => k.trim()).filter(Boolean).forEach(t => tagsSet.add(t));
    }
    $('meta[property="article:tag"]').each((_, el) => {
      const t = $(el).attr('content')?.trim();
      if (t) tagsSet.add(t);
    });
  }

  // 6. Extract Featured Image
  let featuredImage = '';
  if (config.featured_image_selector) {
    const el = $(config.featured_image_selector).first();
    featuredImage = el.attr('src') || el.attr('data-src') || el.attr('content') || '';
  }
  if (!featuredImage) {
    featuredImage = $('meta[property="og:image"]').attr('content')?.trim() || '';
  }
  if (!featuredImage) {
    featuredImage = $('meta[name="twitter:image"]').attr('content')?.trim() || '';
  }

  // Resolve relative featured image url
  if (featuredImage && !featuredImage.startsWith('http') && pageUrl) {
    try {
      featuredImage = new URL(featuredImage, pageUrl).toString();
    } catch (e) {
      // Ignore
    }
  }

  // 7. Extract Content Container
  const candidateSelectors = [
    config.content_selector,
    'article',
    'main article',
    '[itemprop="articleBody"]',
    '.post-content',
    '.article__body',
    '.article-content',
    '.entry-content',
    '.story-body',
    'main',
  ].filter(Boolean) as string[];

  let selectedContentSelector = candidateSelectors[0];
  let contentHtml = '';

  for (const selector of candidateSelectors) {
    const el = $(selector);
    if (el.length > 0) {
      const textLength = el.text().trim().length;
      if (textLength > 100) {
        selectedContentSelector = selector;
        contentHtml = el.html() || '';
        break;
      }
    }
  }

  // Fallback if no matching selector has sufficient content
  if (!contentHtml && $('body').length) {
    selectedContentSelector = 'body';
    contentHtml = $('body').html() || '';
  }

  return {
    title,
    author,
    publishedAt,
    summary,
    tags: Array.from(tagsSet),
    featuredImage,
    contentSelectorUsed: selectedContentSelector,
    contentHtml,
  };
}
