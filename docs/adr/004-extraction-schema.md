# ADR 004: Block-Based Content & Metadata-Only Image Schema

## Context
Raw unparsed HTML blobs make downstream multi-channel syndication (e.g. mobile apps, Telegram messages, CMS publishing) difficult because layout styling is tightly coupled to original markup. Moreover, storing binary images in R2 increases latency and operational cost.

## Decision
1. **Semantic Content Blocks (`article_blocks`)**:
   Decompose article body content into ordered, typed records (`paragraph`, `heading`, `image`, `quote`, `list`) with raw HTML and clean plain text preserved.
2. **Metadata-Only Image Storage (`article_images`)**:
   Do NOT store image binaries in object storage (R2). Only capture high-fidelity metadata (URL, alt text, title, caption, role, dimensions, position).

## Consequences
- Highly modular downstream syndication.
- Fast, cost-efficient edge execution with zero storage bloat.
