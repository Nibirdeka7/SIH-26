# Database Design & Schemas

## 1. PostgreSQL (Relational Data)
- **`patients`**: `id`, `abha_id`, `name`, `dob`, `gender`
- **`clinical_sessions`**: `id`, `patient_id`, `type` (allopathy / ayush), `status`, `red_flag_triggered`
- **`clinical_summaries`**: `id`, `session_id`, `hpi_json` (SOCRATES), `ayush_json` (Dashavidha), `physician_notes`, `version_history`
- **`physicians` & `hospitals`**: Support RBAC (Role-Based Access Control) and multi-tenancy.

## 2. MongoDB (Unstructured / Dialogue Data)
- **Collection `conversations`**: Stores raw dialogue turns (`speaker`, `text`, `audio_url`, `intent`, `entities`) to accommodate dynamic and variable voice intake logs.

## 3. Redis (In-Memory Cache & Session Management)
- **Session Store**: Active session states with TTL (15 minutes).
- **Rate Limiting**: Rate limiter counters per user/IP.
