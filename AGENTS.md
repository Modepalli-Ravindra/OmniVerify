# AGENTS.md

## Neon PostgreSQL (Lakebase Postgres) Backend

This project uses [Neon](https://neon.tech): serverless, branchable Lakebase Postgres with instant autoscaling and compute that scales to zero.

- **Database:** Lakebase Postgres on Neon.
- **Provider:** Neon (`neon`, `neon-postgres` agent skills installed in `skills-lock.json`).
- **Connection Model:**
  - Web Application / FastAPI: Connection-pooled endpoint (`-pooler`) using SQLAlchemy 2.0 with `psycopg2` driver, `pool_pre_ping=True`, and `pool_recycle=300`.
  - Schema Migrations: Direct connection to execute DDL (`backend/app/db/migrations/001_initial_schema.sql`).
- **Credentials:**
  - Read from `DATABASE_URL` in `.env` (configured locally, never committed).
  - `.env.example` provides the connection template.
  - No database credentials are ever exposed to the React frontend, logs, or source control.
- **Architecture Guidelines:**
  - Keep uploaded video files and heavy frame tensors on local/temporary filesystem storage (`backend/uploads/`), persisting only structured metadata, hashes, verdicts, and report paths in PostgreSQL.
  - All foreign keys enforce `ON DELETE CASCADE`.
  - Indexes on `video_hash_sha256` and `created_at` support fast chain-of-custody checks and historical queries.
