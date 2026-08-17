# ADR 001: Cloudflare-Native Edge Architecture

## Context
Traditional crawling systems rely on heavy stateful virtual machines, Docker containers, or Node.js workers that present high maintenance costs, single points of failure, and scalability bottlenecks.

## Decision
Hazardastan is architected natively on Cloudflare Serverless Edge runtime using:
- **Workers + Hono**: Lightweight routing and sub-second execution.
- **Cloudflare D1**: Serverless SQLite database for relational structure.
- **Workers KV**: Sub-millisecond global key-value store for caching configurations and checkpoint deduplication.
- **Cloudflare Queues**: Native async batching and backpressure control without external brokers (Redis/RabbitMQ).

## Consequences
- **Positive**: Zero server management, global distributed distribution, low operational costs, deterministic SQLite state.
- **Negative**: Must strictly adhere to Worker CPU execution limits (10-50ms) and avoid unbundled native binary libraries.
