# Local Development Guide

## 1. Prerequisites
- Node.js 20+ or Bun runtime
- `npm` / `bun` package manager
- Wrangler CLI (`npm install -g wrangler` or via `npx`)

---

## 2. Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start local development server (binds on port 3000)
npm run dev

# 3. Open browser
http://localhost:3000
```

---

## 3. Local Architecture & Emulation
- `server.ts`: Runs local Express server with Vite middleware for React HMR and mounts Hono API routes with an in-memory SQLite (`better-sqlite3`) and KV mock.
- `src/index.ts`: The actual Cloudflare Workers entry point used during production build and deployment.

---

## 4. Code Quality & Verification Commands

```bash
# Type check without emitting files
npm run lint

# Production build check (Vite build + esbuild bundling)
npm run build
```

---

## 5. Branching Strategy

All contributions must follow standard git workflow:

```
main (Production deployment)
  └── develop (Integration branch)
       ├── feature/* (New features or crawler modules)
       ├── fix/* (Bug fixes and patches)
       └── docs/* (Documentation updates)
```
