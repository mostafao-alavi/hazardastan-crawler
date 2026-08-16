import * as cheerio from 'cheerio';
import { ArticleBlock, ArticleImageItem } from '../../types';

export interface NormalizedArticleResult {
  cleanedHtml: string;
  plainText: string;
  wordCount: number;
  readingTimeMin: number;
  blocks: Omit<ArticleBlock, 'id' | 'article_id'>[];
  images: Omit<ArticleImageItem, 'id' | 'article_id'>[];
}

/**
 * Parses article content into sequential, typed content blocks and rich image metadata
 */
export function normalizeContentBlocks(
  contentHtml: string,
  baseUrl: string = '',
  featuredImageUrl: string = ''
): NormalizedArticleResult {
  const $ = cheerio.load(`<div id="article-root">${contentHtml}</div>`, {
    xml: false,
  });

  const root = $('#article-root');
  const blocks: Omit<ArticleBlock, 'id' | 'article_id'>[] = [];
  const images: Omit<ArticleImageItem, 'id' | 'article_id'>[] = [];
  const recordedImageUrls = new Set<string>();

  let orderIndex = 1;

  // Add featured image as block 1 / image 1 if provided
  if (featuredImageUrl) {
    recordedImageUrls.add(featuredImageUrl);
    images.push({
      url: featuredImageUrl,
      original_url: featuredImageUrl,
      alt_text: 'Featured Image',
      title: 'Featured Image',
      caption: '',
      description: '',
      width: 1200,
      height: 630,
      position: 1,
      role: 'featured',
    });
  }

  // Iterate through direct children or main flow elements of the content root
  root.find('h1, h2, h3, h4, h5, h6, p, blockquote, ul, ol, figure, img').each((_, el) => {
    const tagName = el.tagName.toLowerCase();
    const element = $(el);

    // Skip nested elements if parent has already handled it (e.g. img inside figure or p)
    if (tagName === 'img' && (element.closest('figure').length > 0 || element.closest('p').find('img').length > 1)) {
      // Handled in container
      return;
    }

    if (/^h[1-6]$/.test(tagName)) {
      const text = element.text().trim();
      if (text) {
        const level = parseInt(tagName.replace('h', ''), 10);
        blocks.push({
          order_index: orderIndex++,
          block_type: 'heading',
          content_text: text,
          content_html: element.html() || text,
          block_meta: JSON.stringify({ level }),
        });
      }
    } else if (tagName === 'p') {
      // Check if p contains images
      const imgInP = element.find('img');
      if (imgInP.length > 0) {
        imgInP.each((_, imgEl) => {
          const img = $(imgEl);
          const src = img.attr('data-src') || img.attr('src');
          if (src) {
            let absoluteUrl = src;
            try {
              if (baseUrl && !src.startsWith('http') && !src.startsWith('data:')) {
                absoluteUrl = new URL(src, baseUrl).toString();
              }
            } catch (e) {}

            const alt = img.attr('alt') || '';
            const title = img.attr('title') || '';
            const caption = element.find('figcaption').text().trim() || img.parent().next('small, .caption').text().trim() || '';

            blocks.push({
              order_index: orderIndex++,
              block_type: 'image',
              media_url: absoluteUrl,
              media_alt: alt,
              media_caption: caption,
              content_text: caption || alt || 'Image',
              block_meta: JSON.stringify({ src: absoluteUrl, alt, title }),
            });

            if (!recordedImageUrls.has(absoluteUrl)) {
              recordedImageUrls.add(absoluteUrl);
              images.push({
                url: absoluteUrl,
                original_url: src,
                alt_text: alt,
                title,
                caption,
                position: images.length + 1,
                role: absoluteUrl === featuredImageUrl ? 'featured' : 'content',
              });
            }
          }
        });
      }

      // Check text in p (excluding img captions)
      const clone = element.clone();
      clone.find('img, figcaption').remove();
      const text = clone.text().trim();
      if (text && text.length > 5) {
        blocks.push({
          order_index: orderIndex++,
          block_type: 'paragraph',
          content_text: text,
          content_html: clone.html() || text,
          block_meta: JSON.stringify({ word_count: text.split(/\s+/).length }),
        });
      }
    } else if (tagName === 'figure') {
      const img = element.find('img');
      const caption = element.find('figcaption').text().trim();
      const src = img.attr('data-src') || img.attr('src');
      if (src) {
        let absoluteUrl = src;
        try {
          if (baseUrl && !src.startsWith('http') && !src.startsWith('data:')) {
            absoluteUrl = new URL(src, baseUrl).toString();
          }
        } catch (e) {}

        const alt = img.attr('alt') || '';
        const title = img.attr('title') || '';

        blocks.push({
          order_index: orderIndex++,
          block_type: 'image',
          media_url: absoluteUrl,
          media_alt: alt,
          media_caption: caption,
          content_text: caption || alt || 'Image',
          block_meta: JSON.stringify({ src: absoluteUrl, alt, title, caption }),
        });

        if (!recordedImageUrls.has(absoluteUrl)) {
          recordedImageUrls.add(absoluteUrl);
          images.push({
            url: absoluteUrl,
            original_url: src,
            alt_text: alt,
            title,
            caption,
            position: images.length + 1,
            role: absoluteUrl === featuredImageUrl ? 'featured' : 'content',
          });
        }
      }
    } else if (tagName === 'blockquote') {
      const quoteText = element.text().trim();
      const cite = element.find('cite').text().trim() || element.attr('cite') || '';
      if (quoteText) {
        blocks.push({
          order_index: orderIndex++,
          block_type: 'quote',
          content_text: quoteText,
          content_html: element.html() || quoteText,
          media_caption: cite,
          block_meta: JSON.stringify({ citation: cite }),
        });
      }
    } else if (tagName === 'ul' || tagName === 'ol') {
      const items: string[] = [];
      element.find('li').each((_, li) => {
        const itemText = $(li).text().trim();
        if (itemText) items.push(itemText);
      });

      if (items.length > 0) {
        blocks.push({
          order_index: orderIndex++,
          block_type: 'list',
          content_text: items.join('\n• '),
          content_html: element.html() || '',
          block_meta: JSON.stringify({ is_ordered: tagName === 'ol', count: items.length }),
        });
      }
    }
  });

  // Calculate plain text and word count
  const plainText = root.text().replace(/\s+/g, ' ').trim();
  const words = plainText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  return {
    cleanedHtml: root.html() || '',
    plainText,
    wordCount,
    readingTimeMin,
    blocks,
    images,
  };
}
