# Backend Specifications (FastAPI)

## Framework & Architecture
- **Framework**: FastAPI (Async Python) for high concurrency and performance.
- **Authentication**: JWT with refresh tokens, integrated with ABHA OTP flow.

## Key API Endpoints (Separated by Concern)
- `/api/v1/auth/*` — Login, ABHA OTP validation, Token refresh.
- `/api/v1/sessions/*` — Start, Pause, Resume clinical interviews.
- `/api/v1/conversation/*` — Streaming WebSocket for real-time voice chat, or REST for text interaction.
- `/api/v1/documents/*` — Multipart upload, OCR status polling.
- `/api/v1/summary/*` — GET clinical draft summary, POST confirm/edit.

## Async Task Processing
- **Task Queue**: Celery + RabbitMQ for heavy background workloads (OCR processing, long LLM summarization) to avoid blocking the main async API event loop.

## Security & Compliance
- **Encryption**: TLS 1.3 encryption in transit, AES-256 for data at rest.
- **Data Privacy**: Data masking for personally identifiable information (PII).
- **Compliance**: Comprehensive audit logging for DPDP Act 2023 compliance.
