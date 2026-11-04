# NovaCut Studio — Backend Service (Placeholder)

> **Notice:** Backend development is scheduled for a later phase.

## Overview
NovaCut Studio's backend architecture will power the automated AI video editing pipeline, handling:
- Video ingestion, audio demuxing, and transcode processing (FFmpeg / GPU acceleration).
- Whisper / Speech-to-text automated transcription and timestamp alignment.
- Large Vision-Language Models (LLM/VLM) for semantic cut decision generation based on user natural-language prompts.
- Neural color grading, silence removal, dynamic zoom framing, and caption burn-in.
- High-performance timeline rendering and cloud export.

## Future API Specification
The frontend is architected to interface seamlessly with the future backend via typed services (`frontend/src/services/apiClient.ts`):
- `GET  /api/health` — Engine health and hardware capability discovery
- `POST /api/v1/projects` — Create project
- `POST /api/v1/media/upload` — Ingest source video assets
- `POST /api/v1/ai/analyze` — Run speech and scene analysis
- `POST /api/v1/ai/generate-cut` — Execute LLM-directed timeline cutting
- `GET  /api/v1/jobs/:jobId/status` — SSE / Polling for real-time render status
- `POST /api/v1/export` — Trigger final composite video rendering

## Setup Instructions
Backend setup instructions will be published here upon implementation in Phase 2.

