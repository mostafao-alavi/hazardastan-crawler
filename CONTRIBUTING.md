# Contributing to Hazardastan Crawler

Thank you for your interest in contributing to **Hazardastan Crawler**! This document provides guidelines for developers, architects, and AI coding agents contributing to this codebase.

---

## 1. Core Architectural Tenets

1. **Cloudflare-Native Edge Only**: All backend code must run within the Cloudflare Workers V8 serverless isolate environment. Never introduce external Node.js servers, containers, or native C++ addons.
2. **Strict API Versioning**: All API endpoints must reside under `/api/v1/`. Legacy `/api/*` aliases are maintained strictly for backward compatibility.
3. **D1 Schema Integrity**: All database modifications must be accompanied by migration scripts and reflected in `schema.sql`. Never execute ad-hoc schema modifications in runtime code.
4. **Metadata-Only Image Storage**: Binary image blobs must NEVER be stored in Cloudflare D1. Only image URLs, roles, dimensions, alt text, and captions are recorded.
5. **No AI/Translation in Core Crawler**: The core crawler engine is strictly responsible for ingestion, extraction, cleaning, normalization, storage, and backup. AI processing is isolated to downstream modules.

---

## 2. Git & Branching Strategy

- `main`: The stable production branch. Directly deployed to Cloudflare Workers edge.
- `develop` / `sprint-*`: Feature and sprint development branches.
- `feature/<name>`: Individual feature branches branched off from sprint development.
- `hotfix/<name>`: Critical production bug fixes.

---

## 3. Commit Message Convention

All commits must follow the **Conventional Commits** specification:

```text
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Allowed Types
- `feat`: A new user-facing or architectural feature
- `fix`: A bug fix
- `docs`: Documentation updates or ADR additions
- `refactor`: Code restructuring without functional changes
- `perf`: Performance optimizations
- `test`: Adding or correcting tests
- `chore`: Build system, configuration, or release preparation

### Examples
- `feat(crawler): implement adaptive date window range parsing`
- `fix(d1): sanitize batch transaction query parameters`
- `chore(release): prepare v2.0.0-core-freeze production release`

---

## 4. Testing & Verification

Before submitting a Pull Request, you MUST run:

```bash
# 1. TypeScript Strict Type Check
npm run lint

# 2. Production Build Verification
npm run build
```

Both commands must pass with zero errors and zero warnings.

---

## 5. Pull Request (PR) Requirements

1. **Self-Contained Changes**: Keep PRs focused on a single responsibility or ADR scope.
2. **Documentation**: Update relevant files in `/docs` or `/docs/adr` if architectural or API changes are introduced.
3. **No Sensitive Data**: Ensure no secrets, tokens, `.env` files, or local database files are committed.
4. **PR Template Checklist**:
   - [ ] Passed `npm run lint` (TypeScript `--noEmit`)
   - [ ] Passed `npm run build`
   - [ ] Verified Cloudflare bindings in `wrangler.toml`
   - [ ] Verified `/api/v1/*` endpoint contract
