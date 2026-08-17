# ADR 002: Single-Database D1 Strategy

## Context
Early prototypes explored multi-database setups (e.g. separating archive data from active news). This introduced deployment complexity, duplicate bindings in `wrangler.toml`, and cross-database query limitations.

## Decision
Unify all core entities into a **single, robust 12-table D1 database** (`hazardastan-d1-1`).

## Consequences
- Single binding `env.DB` referenced in all worker logic and API endpoints.
- Full relational integrity: Foreign keys with `ON DELETE CASCADE` manage parent-child relationships between sources, configs, articles, blocks, and images.
- Simplifies backup, migration, and local testing.
