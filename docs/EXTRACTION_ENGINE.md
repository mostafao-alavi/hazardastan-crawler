# Extraction Engine & DOM Processing

## 1. Scope & Objective
The Extraction Engine transforms unstructured HTML pages into clean, highly structured, modular article blocks and rich image references without saving raw binary blobs.

---

## 2. Extraction Configuration Schema

Each source maintains a dynamic configuration record in `source_configs`:

```json
{
  "title_selector": "h1.article-title, h1.headline",
  "subtitle_selector": ".article-subheadline",
  "summary_selector": "meta[name='description'], .lead-paragraph",
  "author_selector": ".author-name, rel[author]",
  "published_date_selector": "time[datetime], meta[property='article:published_time']",
  "content_selector": "article.post-content, div.entry-content",
  "tags_selector": ".tags-list a",
  "featured_image_selector": "meta[property='og:image'], .featured-img img",
  "article_images_selector": "img",
  "remove_selectors": [
    "script", "style", "iframe", "noscript",
    ".ads", ".ad-container", ".newsletter-signup",
    ".social-share-buttons", ".related-articles"
  ],
  "cleaning_rules": {
    "strip_empty_paragraphs": true,
    "strip_inline_styles": true,
    "strip_class_attributes": true,
    "convert_relative_urls_to_absolute": true,
    "min_content_length": 150,
    "min_word_count": 30
  }
}
```

---

## 3. Structured Block Generation (`article_blocks`)

The body content is decomposed into sequential items in `article_blocks`:

| Block Type | Content Extracted |
| :--- | :--- |
| `heading` | Subheadings (`<h2>`, `<h3>`, `<h4>`) with level preserved |
| `paragraph` | Text paragraphs with cleaned inline formatting |
| `image` | Inline images with `media_url`, `media_caption`, and `media_alt` |
| `quote` | Blockquotes and pull quotes |
| `list` | Ordered and unordered list items |

---

## 4. Image Metadata Extraction (`article_images`)

No images are downloaded or stored in R2. The engine parses image tags and captures:
- `url`: Canonical absolute URL
- `original_url`: Literal src/data-src attribute
- `alt_text`: Accessible description
- `title`: Title attribute
- `caption`: Associated figcaption or closest text container
- `description`: Surrounding text paragraph
- `role`: `'featured'` (hero image) or `'content'` (inline body image)
- `position`: Numeric ordering inside the article
