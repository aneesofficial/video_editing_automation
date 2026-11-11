# Studio

Autonomous Video and Photo Editing Workstation. Turn raw footage, photos, and prompts into polished social videos and thumbnails. Built entirely with free and local tools.

---

## Quick Start

### Starting the Application
Run `start.bat` in the project root:
- Backend Server: http://localhost:3001
- Frontend Web App: http://localhost:5173
- Public Health Check: http://localhost:3001/api/health (returns `{"status":"ok"}`)
- Neutral Diagnostics: http://localhost:3001/api/v1/system/check

### Stopping the Application
Run `stop.bat` to terminate all background servers.

---

## Architecture (3 Pages)

1. **Home (`/`)**: Clean dashboard with New Project creation, client filter, project search, and project card grid with version history and management.
2. **Editor (`/editor`)**: Single-column workflow:
   - Upload media and manage project assets
   - Platform format buttons (YouTube, YouTube Shorts, TikTok, Instagram Reel, Instagram Post 1:1, Instagram Post 4:5)
   - Prompt instructions with validation
   - One-click edit creation with real-time status
   - Video player with Download, Higher Quality, and Change Request versions
3. **Settings (`/settings`)**: Vertical tabs for:
   - Profile: User details
   - Brand: Logo, colors, watermark position and opacity
   - Edit defaults: Captions, music, watermark, and speech preferences
   - Music: Background audio library
   - Services: Edit service key and Footage service key configuration
   - Storage and Backup: Disk usage, cache cleanup, and instant backups
   - System check: Component status and verification

---

## System Requirements

- Operating System: Windows 10 or 11
- Node.js: v18 or newer
- Python: 3.10 to 3.14
- Video Engine: Video processing binaries in PATH

---

## Verification

To run the automated smoke test:
```bash
npm run smoke
```
This tests:
1. System diagnostics and operational status (via neutral system check)
2. Photo editing processing
3. Video render execution and stream integrity

---

## Storage Architecture

All data remains local in `backend/storage/`:
```
backend/storage/
├── clients/              # Client & project workspaces
│   └── <ClientName>/
│       └── <ProjectId>/
│           ├── raw/      # Raw uploaded media
│           ├── previews/ # Proxy previews
│           ├── exports/  # Rendered MP4s and photos
│           ├── plans/    # Edit plans
│           └── project.json
├── brand/                # Brand kit assets
├── music-library/        # Audio tracks
├── models/               # Local models
└── temp/                 # Temporary render scratch space
```
