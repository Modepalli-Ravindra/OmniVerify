# OmniVerify — Phase D: Backend-First Hardening & Reliability Audit Report

**Date:** 2026-10-21  
**Target Environment:** Windows CPU Laptop (Intel Core, x86_64, Windows 11)  
**Git Baseline Commit:** `82fbcc9` (`main`)  
**Scope:** Backend Only (`backend/app/`, `backend/tests/`)  
**Backend Framework & Database:** FastAPI, Python 3.14, SQLAlchemy 2.0, Neon PostgreSQL (Lakebase Postgres 18), Neon Managed Better Auth, Neon Object Storage (Private Bucket `files`)

---

## Executive Summary

Phase D conducted an exhaustive reliability, security, and contract hardening audit of the OmniVerify backend. OmniVerify uses an asynchronous FastAPI service delivering multi-signal temporal, noise, spectral, and object-level forensic analysis backed by serverless Neon PostgreSQL and S3-compatible Neon Object Storage.

Key outcomes achieved in Phase D:
1. **Tenant Isolation Enforced:** Identified and resolved a critical authorization gap in `/api/history` and forensic endpoints where unauthenticated callers could query across multi-tenant boundaries. Implemented strict database filtering where authenticated users access exclusively their own records (`user_id == current_user.id`), and anonymous callers access strictly unauthenticated sessions (`user_id IS NULL`).
2. **Path Traversal & 0-Byte Input Hardening:** Hardened upload routes against arbitrary directory traversal via `Path(file.filename).name` and added strict 0-byte file validation with immediate HTTP 400 responses, preventing unhandled zero-frame division exceptions in OpenCV.
3. **Session Lifecycle & Transactional Cascading Deletions:** Added explicit transactional rollback blocks in `backend/app/db/crud.py` to prevent zombie sessions upon transient database errors. Added `DELETE /api/analysis/{analysis_id}` with verified database cascading deletion removing parent analyses and related signal records in a single atomic transaction.
4. **Empirical CPU & Memory Profiling:** Benchmarked memory allocation and latency on the Windows CPU target using `tracemalloc` and high-resolution timing. The multi-modal analysis pipeline executed in **16.77 seconds** for 15 sampled frames (~1.12s per frame) with a bounded peak memory consumption of **38.27 MB**, proving stability on CPU-only edge environments.
5. **Regression Verification:** Added 6 comprehensive hardening regression tests (`backend/tests/test_phase_d_hardening.py`). All 38 backend tests passed in 54.73s, and the React frontend production build succeeded with zero errors.

---

## 1. Audit Findings by Severity

| ID | Severity | Component | Finding Description | Status |
|---|---|---|---|---|
| **SEC-01** | **Critical** | `crud.py` / `/api/history` | **Cross-Tenant Data Leakage in History:** `get_recent_analyses` previously did not filter by `user_id` when the caller was unauthenticated, exposing authenticated users' forensic records to anonymous callers. | **FIXED** (Enforces `user_id.is_(None)` for anonymous; `user_id == token.user_id` for authenticated) |
| **SEC-02** | **High** | `/api/analysis/{id}`, `/api/reports/{filename}/*` | **Missing Tenant Ownership Verification on Lookup:** UUID and filename lookup endpoints allowed unauthorized callers to view analysis details and generated forensic reports belonging to other tenants. | **FIXED** (Enforced `user_id` matching on lookup; unauthorized access returns HTTP 403 Forbidden) |
| **SEC-03** | **High** | `/upload` | **Path Traversal Vulnerability in Upload:** Video filename parameter was previously joined directly to local storage directory without stripping path separators (`../`). | **FIXED** (Sanitized with `Path(file.filename).name` and regex sanitization) |
| **REL-01** | **Medium** | `/upload` & `/analyze` | **Zero-Byte File Crash:** Empty video files (0 bytes) triggered uncaught OpenCV initialization exceptions and 500 Internal Server Errors with stack traces. | **FIXED** (Added explicit byte validation rejecting empty files with HTTP 400 Bad Request) |
| **REL-02** | **Medium** | `crud.py` | **Missing Session Rollback on Transient DB Error:** `save_analysis()` lacked explicit `db.rollback()` within exception handling blocks, risking tainted sessions in connection pools. | **FIXED** (Added `try...except: db.rollback(); raise` in CRUD persistence routines) |
| **REL-03** | **Medium** | `video_processor.py` | **OpenCV Capture Descriptor Leak on Failure:** If an exception occurred during frame decoding, `cap.release()` was skipped, leaving Windows file handles locked. | **FIXED** (Wrapped frame reading in `try...finally: cap.release()`) |
| **DAT-01** | **Low** | `routes.py` / `schemas.py` | **Untyped & Ambiguous API Status:** Analysis responses did not return `analysis_id`, `analysis_status`, or explicit `persisted_to_database` flags. | **FIXED** (Added typed fields to `AnalysisResponse` and `AnalysisSummaryItem`) |

---

## 2. API Endpoint Inventory & Contracts

All endpoints sanitize exceptions to ensure no internal Python tracebacks, database connection strings, or local filesystem paths are exposed to clients.

| HTTP Method | Route | Auth Required? | Request Payload | Response Schema | Status Codes |
|---|---|---|---|---|---|
| `GET` | `/` | No | None | `{"name": str, "version": str, "description": str, "status": str}` | `200` |
| `GET` | `/health` | No | None | `HealthResponse` (`status`, `timestamp`, `version`, `models_loaded`, `active_features`, `database_connected`, `database_engine`, `database_version`, `model_weights_status`) | `200` |
| `POST` | `/upload` | Optional | `multipart/form-data` (`file: UploadFile`) | `UploadResponse` (`filename`, `original_name`, `file_size_bytes`, `content_type`, `upload_timestamp`, `message`) | `200`, `400`, `413` |
| `POST` | `/analyze/{video_filename}` | Optional (Scopes to user if present) | URL path param | `AnalysisResponse` (`video_metadata`, `face_detection`, `temporal_consistency`, `noise_residual`, `frequency_domain`, `fusion_result`, `verdict`, `analysis_id`, `analysis_status`, `persisted_to_database`, `user_id`, `report_paths`) | `200`, `400`, `404`, `422`, `500` |
| `GET` | `/api/analysis/{analysis_id}` | Optional (Enforces ownership) | URL path param (UUIDv4) | `AnalysisResponse` (Matches schema above) | `200`, `400`, `403`, `404` |
| `DELETE` | `/api/analysis/{analysis_id}` | Yes (Bearer JWT) | URL path param (UUIDv4) | `{"deleted": bool, "analysis_id": str, "message": str}` | `200`, `400`, `401`, `403`, `404` |
| `GET` | `/api/history` | Optional | Query `limit: int = 10` | `HistoryResponse` (`analyses: List[AnalysisSummaryItem]`, `total: int`, `scoped_user: Optional[str]`) | `200` |
| `GET` | `/api/reports/{filename}/json` | Optional (Enforces ownership) | URL path param | Forensic JSON report download | `200`, `400`, `403`, `404` |
| `GET` | `/api/reports/{filename}/html` | Optional (Enforces ownership) | URL path param | Forensic HTML report download | `200`, `400`, `403`, `404` |
| `GET` | `/api/neon/status` | No | None | `{"database": {...}, "object_storage": {...}, "ai_gateway": {...}}` | `200` |

### Validation Matrix
- **File Types:** Rejects non-video extensions (`.txt`, `.exe`, `.py`) with HTTP 400. Allowed: `.mp4`, `.avi`, `.mov`, `.mkv`, `.webm`.
- **File Size:** Enforces 0-byte check (HTTP 400) and max file size cap (500 MB, HTTP 413).
- **UUIDs:** Enforces RFC 4122 compliance on `{analysis_id}` path parameters; non-UUID parameters return HTTP 400 with `Invalid analysis ID format. Expected UUIDv4.`.
- **Corrupted Streams:** OpenCV unreadable frames or zero decoded frames return clean HTTP 422 Unprocessable Entity with `Video file appears corrupted or contains zero decodable frames.`.

---

## 3. Authentication & Tenant Isolation Audit

### Token Lifecycle & Signature Validation
The backend authenticates incoming requests using `backend/app/core/auth.py`:
- Validates standard JSON Web Tokens against `BETTER_AUTH_SECRET` using `HS256`.
- Explicitly handles `ExpiredSignatureError` (returns `Token expired`), `InvalidTokenError` / `DecodeError` / `InvalidSignatureError` (returns `Invalid or malformed authentication token`).
- In case of malformed `Authorization` headers, returns HTTP 401 Unauthorized without leaking token contents, cryptographic signatures, or internal traces.

### Tenant Isolation Verification
Tested and verified multi-tenant boundaries via automated test suite `test_phase_d_hardening.py`:
1. **User A vs User B Isolation:** When User A creates an analysis with their authenticated JWT, User B (holding an authenticated JWT with a distinct `sub` claim) receives HTTP 403 Forbidden when requesting `/api/analysis/{user_a_analysis_id}`.
2. **Report Asset Isolation:** User B receives HTTP 403 Forbidden when attempting to retrieve User A's generated JSON/HTML reports via `/api/reports/{user_a_filename}/json`.
3. **Deletion Isolation:** User B receives HTTP 403 Forbidden when attempting to delete User A's analysis record via `DELETE /api/analysis/{user_a_analysis_id}`.
4. **History Privacy:**
   - Authenticated User A querying `/api/history` receives solely User A's analyses.
   - Anonymous unauthenticated users querying `/api/history` receive exclusively anonymous analyses (`user_id IS NULL`), preventing leakage of private user filenames and analysis UUIDs.

---

## 4. Neon PostgreSQL & Object Storage Reliability

### Session Lifecycle & Connection Pool
- **Driver:** `psycopg2-binary` using SQLAlchemy 2.0.
- **Connection Model:** Connection-pooled Neon endpoint (`-pooler.ap-southeast-1.aws.neon.tech`) using:
  - `pool_pre_ping=True`: Verifies connection liveness before checkout, preventing stale socket errors from serverless scale-to-zero.
  - `pool_recycle=300`: Periodically recycles idle connections every 5 minutes to prevent Neon gateway timeout disconnections.
- **Rollback Behavior:** In `backend/app/db/crud.py`, `save_analysis()` is wrapped in `try...except: db.rollback(); raise` ensuring any aborted write releases locks and preserves pool health.

### Database Cascading Deletions
The relational schema defines `ON DELETE CASCADE` on all foreign key constraints linking child forensic records to the root `video_analyses` table:
```sql
ALTER TABLE temporal_consistency_signals 
ADD CONSTRAINT fk_temporal_analysis 
FOREIGN KEY (analysis_id) REFERENCES video_analyses(id) ON DELETE CASCADE;
```
Verified in `test_phase_d_cascading_deletion`: deleting a parent `VideoAnalysis` automatically purges the corresponding `TemporalConsistencySignal`, `NoiseResidualSignal`, `FrequencyDomainSignal`, and `SuspiciousInterval` rows in a single atomic transaction without orphaned child records.

### Neon Object Storage (Private Bucket `files`)
- Storage operates against private bucket `files` via S3-compatible credentials.
- **Presigned URLs:** Generated with strict 3600-second (1 hour) expiration for authenticated access. Presigned URLs are never committed or logged in persistent database tables.
- **Degraded Mode Resilience:** If Neon PostgreSQL or Object Storage is unreachable, OmniVerify falls back to structured in-memory tracking (`persisted_to_database = False`) and continues serving forensic inferences, returning clear persistence flags in the response schema.

---

## 5. Forensic Pipeline Correctness & Resource Profiling

### Pipeline Integrity
- **Uniform Bounded Sampling:** Frame sampling is bounded by `max_frames` (default: 15–30 frames uniformly spaced over the video duration). This guarantees bounded execution time and memory limits regardless of file size.
- **Evidence Fusion:** Heuristic evidence fusion combines noise residuals, optical flow motion discrepancies, and 2D FFT spectral high-frequency decay using a log-odds weighted voting head.
- **Scientific Qualification:** The pipeline explicitly disclaims certainty. No single signal is claimed to prove deepfake manipulation; results represent calibrated multi-dimensional heuristic likelihoods.

### CPU Latency & Memory Benchmarks (Windows CPU Target)
Empirical profiling conducted on the target host running full multi-signal analysis (Scene detection, SSDLite face/object detection, Farneback optical flow, SSIM, PRNU-style noise residual, and 2D FFT frequency analysis):

| Metric | Measured Value | Methodology |
|---|---|---|
| **Input Resolution** | 320 × 240 px | Standard synthetic test clip |
| **Sampled Frames** | 15 frames | Uniform temporal sampling |
| **Pipeline Latency** | **16.77 seconds** | High-resolution wall-clock (`time.perf_counter()`) |
| **Per-Frame Latency** | **~1.12 seconds / frame** | Windows CPU execution |
| **Peak Memory Allocation** | **38.27 MB** | Python `tracemalloc.get_traced_memory()` |
| **Post-Analysis Residual Memory** | **0.84 MB** | Garbage collection verified |

> [!NOTE]
> The memory profile remains bounded under 40 MB due to sequential frame evaluation and immediate numpy buffer release, confirming stability on resource-constrained consumer laptops.

---

## 6. Test Suite & Verification Results

### Test Execution Summary
Executed full automated test suite:
```powershell
python -m pytest backend/tests
```
**Outcome:** **38 passed in 54.73s** (100% pass rate).

| Test Module | Tests | Status | Coverage Focus |
|---|---|---|---|
| `test_phase_d_hardening.py` | 6 | **PASS** | 0-byte upload rejection, path traversal sanitization, UUIDv4 validation, multi-tenant isolation, database cascading deletion, and CPU memory/latency profiling. |
| `test_api.py` | 6 | **PASS** | Upload, analysis, health check, reporting routes, and response schemas. |
| `test_database.py` | 2 | **PASS** | SQLAlchemy session, CRUD persistence, and retrieval. |
| `test_neon_services.py` | 7 | **PASS** | Neon PostgreSQL connectivity, Better Auth verification, Object Storage S3 upload/presigned URLs, AI Gateway reachability. |
| `test_evaluation_harness.py` | 5 | **PASS** | Phase C pilot dataset evaluation, metrics computation, AUROC calculation. |
| `test_evidence_fusion.py` | 4 | **PASS** | Heuristic fusion scoring, threshold calibration, and log-odds calculation. |
| `test_forensics.py` | 2 | **PASS** | PRNU noise residual and FFT high-frequency spectral signals. |
| `test_object_detector.py` | 2 | **PASS** | SSDLite-MobileNetV3 face/person bounding box inference. |
| `test_temporal_flow.py` | 2 | **PASS** | Gunnar-Farneback optical flow and SSIM temporal consistency. |
| `test_video_processing.py` | 2 | **PASS** | Uniform frame sampling, video metadata extraction, and descriptor cleanup. |

### Frontend Build Verification
Executed React production build:
```powershell
cd frontend; npm run build
```
**Outcome:**
- `dist/index.html`: 0.87 kB
- `dist/assets/index-CnNbD3oK.css`: 4.97 kB
- `dist/assets/index-B2a827KT.js`: 186.05 kB
- **Result:** Build completed in 3.70s with zero TypeScript or Vite bundle errors.

---

## 7. Changed Files and Git Status

### Repository State
- **Branch:** `main`
- **Head Commit:** `82fbcc9`
- **Remote Push:** None (Local only)
- **Phase C Preservation:** All uncommitted Phase C evaluation scripts, pilot dataset files, and documentation were strictly preserved.

### Modified Files (Phase D Hardening)
- [backend/app/api/routes.py](file:///c:/Users/user/OneDrive/Desktop/OmniVerify/backend/app/api/routes.py): Path traversal sanitization, 0-byte validation, tenant isolation on lookup/deletion/reports, explicit UUID format validation, and cascade deletion endpoint.
- [backend/app/api/schemas.py](file:///c:/Users/user/OneDrive/Desktop/OmniVerify/backend/app/api/schemas.py): Added `analysis_id`, `analysis_status`, `persisted_to_database`, `user_id`, `AnalysisSummaryItem`, and `HistoryResponse` models.
- [backend/app/core/auth.py](file:///c:/Users/user/OneDrive/Desktop/OmniVerify/backend/app/core/auth.py): Hardened token verification exception handling without secret leakage.
- [backend/app/db/crud.py](file:///c:/Users/user/OneDrive/Desktop/OmniVerify/backend/app/db/crud.py): Transactional rollback safety, user-scoped queries, cascading deletion routine, and anonymous-only history fallback.
- [backend/app/services/video_processor.py](file:///c:/Users/user/OneDrive/Desktop/OmniVerify/backend/app/services/video_processor.py): `try...finally: cap.release()` descriptor safety.
- [backend/tests/test_api.py](file:///c:/Users/user/OneDrive/Desktop/OmniVerify/backend/tests/test_api.py): Updated status codes and schema validations.
- [backend/tests/test_phase_d_hardening.py](file:///c:/Users/user/OneDrive/Desktop/OmniVerify/backend/tests/test_phase_d_hardening.py): 6 new regression tests covering the full hardening surface.

---

## 8. Unresolved Risks & Recommended Next Steps

1. **Model Weights Deployment:** SSDLite-MobileNetV3 is currently configured for real-time edge CPU inference. In future deployments, dynamic model loading from Neon Object Storage can ensure automated weight versioning.
2. **Asynchronous Background Task Queue:** For longer video clips (>60 seconds), synchronous HTTP POST execution can approach browser timeout limits. Migrating video processing to a background worker (e.g. Celery / ARQ / FastAPI background tasks with polling or WebSocket status updates) is recommended for production scaling.
3. **Database Re-indexing:** As historical analyses grow, adding a composite index on `(user_id, created_at DESC)` in PostgreSQL will maintain sub-millisecond history queries under high concurrency.
