# Security Architecture & Policies

**Project:** Hazardastan Crawler  
**Classification:** Cloudflare Serverless Edge Security Policy  
**Version:** 2.0.0-core-freeze  

---

## 1. Security Overview

Hazardastan Crawler executes exclusively within the Cloudflare Workers serverless edge execution environment. The application adheres to a zero-trust, edge-first security model with strict boundary validation, defense-in-depth sanitization, and least-privilege resource binding.

---

## 2. Threat Model & Mitigation Matrix

| Threat / Attack Vector | Risk Level | Mitigation Strategy | Implementation Location |
| :--- | :--- | :--- | :--- |
| **Server-Side Request Forgery (SSRF)** | Critical | URL validation, scheme restriction (HTTP/HTTPS only), private IPv4/IPv6 address filtering, loopback block | `src/core/crawler/fetcher.ts`, `src/api/routes.ts` |
| **Cross-Site Scripting (XSS) / HTML Injection** | High | Multi-stage HTML sanitization with Cheerio, script/iframe stripping, text normalization | `src/core/crawler/extractor.ts`, `src/core/crawler/cleaner.ts` |
| **Database Injection (SQLi)** | High | 100% Parameterized D1 queries (`db.prepare().bind()`), strict schema types | `src/api/routes.ts`, `src/core/crawler/storage.ts` |
| **Denial of Service (DoS) / Crawler Trap** | Medium | Configurable fetch timeouts (default 8000ms), maximum redirect depth (3), max payload caps (5MB) | `src/core/crawler/fetcher.ts` |
| **Secret Exfiltration / Key Exposure** | Critical | Cloudflare Environment Secret Bindings (`env.SECRET`), zero client-side secret exposure | `wrangler.toml`, Cloudflare Workers Secrets |
| **D1 Storage Abuse** | Medium | Metadata-only image storage policy (no binary blobs), 7-day text garbage collection | `src/cron/scraper.ts`, `src/api/routes.ts` |

---

## 3. Server-Side Request Forgery (SSRF) Protection

When crawling untrusted URLs discovered via feeds, sitemaps, or user input:

1. **Protocol Restrictions:** Only `http://` and `https://` schemes are permitted. `file://`, `gopher://`, `ftp://`, and internal schemes are immediately rejected.
2. **Private IP & Loopback Blocking:**
   - IPv4 Loopback: `127.0.0.0/8`
   - IPv4 Private Blocks: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` (Cloud Metadata)
   - IPv6 Loopback / Private: `::1`, `fc00::/7`, `fe80::/10`
   - Cloud Provider Metadata Services (e.g., `169.254.169.254`, `metadata.google.internal`) are strictly prohibited.
3. **Domain Resolution Verification:** DNS resolution checks ensure requests cannot bypass filters via dynamic DNS rebinding.

---

## 4. Content Cleaning & HTML Sanitization

Extracted content passes through an 8-stage isolation pipeline before persisting in Cloudflare D1:

1. **Dangerous Element Removal:** All `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<noscript>`, `<form>`, `<input>`, `<button>`, and `<meta>` tags are stripped during the `CLEAN` stage.
2. **Attribute Stripping:** Inline JavaScript handlers (`onclick`, `onload`, `onerror`, etc.) and non-essential styling attributes (`style`, `class`, `id`) are sanitized.
3. **URL Normalization:** Relative URLs for images and canonical anchors are resolved against the verified source base URL using standard `URL` parser mechanics.
4. **Structured Block Isolation:** Body text is segregated into typed blocks (`paragraph`, `heading`, `image`, `quote`, `list`) ensuring unstructured raw HTML is not passed downstream.

---

## 5. Secret & Credential Management

- **Zero Hardcoded Secrets:** No API tokens, passwords, or private keys are stored in the codebase or version control.
- **Workers Secrets:** Production secrets (Google Sheets Web App tokens, Telegram Bot tokens, WordPress credentials) are managed via `wrangler secret put <KEY>`.
- **Local Development:** `.env.example` documents required binding variables without sensitive values.
- **Client Separation:** Secrets are strictly bound to Worker `c.env` contexts and are never delivered in `/api/v1/*` responses to the frontend.

---

## 6. HTTP Security Headers

Every response passing through the Cloudflare Worker incorporates standard defensive HTTP headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 7. Rate Limiting & Resource Quotas

- **Source Rate Limiting:** Per-source `rate_limit_delay_ms` (default: 500ms) enforces delays between successive fetch operations.
- **Worker CPU Budget:** Tasks are partitioned across Cloudflare Queue batches to operate within the 50ms (Free) / 30s (Unbound) CPU time limit.
- **D1 Transaction Hygiene:** Batch writes (`db.batch([])`) are preferred over serial single-statement executions to maximize throughput and minimize locking.

---

## 8. Reporting Security Vulnerabilities

To report a vulnerability or security defect:
- File a confidential report with the Hazardastan Engineering Security Team.
- Include detailed reproduction steps, target URLs, and potential impact assessment.
