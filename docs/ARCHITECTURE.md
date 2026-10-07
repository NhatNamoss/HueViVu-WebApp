# HueViVu production architecture

HueViVu stays a modular monolith for business logic. The existing Next.js API is not migrated to NestJS yet.

## Runtime layers

1. Next.js — web UI and business API.
2. SQLite today — preserve existing data and migration simplicity. Move to managed PostgreSQL when multi-instance/server scaling requires it.
3. Redis + BullMQ (optional) — durable background jobs when REDIS_URL is configured.
4. FastAPI (optional) — Python/ML boundary for RAG and YOLO. The web app talks to it through AI_SERVICE_URL.
5. Three.js/GLB — 3D remains isolated from backend architecture.

## Production benefits

- No rewrite of existing routes or frontend.
- Background work has retries/backoff once Redis is provisioned.
- AI/ML can scale independently from the web process.
- Structured logs and request IDs make production failures traceable.
- A future NestJS migration can preserve the AI service contract.

## Deliberately not added yet

- Kafka/event streaming.
- Microservices for users/places/trips.
- A vector database before the knowledge corpus and retrieval evaluation exist.
- YOLO weights before a labeled Huế dataset exists.
- NestJS migration before the current API becomes a maintenance bottleneck.

## Environment

Required: JWT_SECRET >= 32 characters, HTTPS, persistent database/storage.

Optional: REDIS_URL, AI_SERVICE_URL, AI_SERVICE_TIMEOUT_MS.

The service boundaries are additive: if Redis or FastAPI is absent, existing HueViVu features continue to run.
