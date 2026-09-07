# Database Schema — MediKiosk

PostgreSQL, MongoDB, and Redis schema for the clinical intake platform.

## Setup

1. Install Docker Desktop.
2. From this folder, run:
3. Connect to Postgres (DBeaver or any client):
   - Host: `localhost`
   - Port: `5432`
   - Database: `medikiosk_db`
   - User: `medikiosk`
   - Password: `devpassword`
4. Run `schema.sql` against `medikiosk_db` to create all tables.
5. MongoDB is available at `mongodb://localhost:27017`. Create a database
   named `medikiosk_db` with a `conversations` collection (see shape below).

## PostgreSQL Tables

| Table | Purpose |
|---|---|
| `hospitals` | Tenant boundary. Every patient/physician belongs to one hospital. |
| `physicians` | Doctor/admin accounts. `role` drives RBAC. |
| `patients` | Patient identity plus accessibility and language preferences. |
| `consents` | Granular consent records per patient. |
| `clinical_sessions` | One intake session per visit. `status` tracks in_progress / paused / ready / completed. |
| `clinical_summaries` | AI-drafted and doctor-confirmed summary. One-to-one with `clinical_sessions`. |
| `summary_versions` | Edit history for summaries — the original AI draft plus every doctor edit. |
| `documents` | Scanned prescriptions and reports. Stores a reference to S3/MinIO storage, not the file itself. |
| `lab_values` | Individual extracted values from documents — test name, value, and normal/borderline/critical status. |
| `refresh_tokens` | JWT refresh tokens. Exactly one of `patient_id` / `physician_id` is set, enforced by a CHECK constraint. |
| `audit_logs` | Append-only compliance log. Deliberately has no foreign keys — `target_table` / `target_id` can reference a row in any table. |

## Important notes for the backend team

- **`hpi_json` / `ayush_json` (JSONB):** a value inside can be `null` (never asked) or the literal string `"Unknown"` (asked, but the AI is uncertain). These mean different things clinically — please don't normalize `"Unknown"` to `null` when parsing.
- **`clinical_summaries.session_id`** has a `UNIQUE` constraint — this enforces one summary per session at the database level, not just by convention.
- **`refresh_tokens`** requires exactly one of `patient_id` / `physician_id` to be set. Leave the other as `NULL`, not `0` or any other placeholder.
- **MongoDB `conversations`** links to Postgres via `session_id` as an application-level reference only — not a real foreign key, since it crosses databases.

### MongoDB `conversations` document shape
```json
{
  "client_generated_id": "uuid-from-device",
  "session_id": 1,
  "speaker": "patient",
  "text": "...",
  "audio_url": null,
  "intent": "symptom_report",
  "entities": { "symptom": "chest pain" },
  "timestamp": "2026-09-07T10:00:00Z",
  "synced_at": "2026-09-07T10:00:05Z"
}
```

## Redis key patterns

| Key pattern | Value | TTL |
|---|---|---|
| `session:{session_id}` | Serialized active session state | 15 minutes |
| `ratelimit:{user_id}:{endpoint}` | Request counter | Short (e.g. 60s) |

## Files in this folder

- `docker-compose.yml` — spins up Postgres and MongoDB locally.
- `schema.sql` — full PostgreSQL DDL (tables, foreign keys, constraints, indexes).
- `ER_diagram.png` — entity relationship diagram.

## For reviewers

Please confirm the table and column names/types here match what your FastAPI Pydantic models expect. Flag anything before building on top of this so we can avoid rework later.