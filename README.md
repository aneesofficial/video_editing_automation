# NovaCut Studio 🎬

> **Autonomous AI-Powered Video & Photo Editing Workstation**  
> Turn raw footage, photos, and prompts into polished social videos (YouTube, TikTok, Reels, Shorts) and thumbnails without manual timeline cutting. Built entirely with free and local tools.

---

## ⚡ Quick Start (1-Click Launch)

### Starting the Studio
Double-click **`start.bat`** in the project folder.  
It will automatically:
1. Start the **Backend Server** on `http://localhost:3001`
2. Start the **Frontend Web App** on `http://localhost:5173`
3. Open your default web browser to `http://localhost:5173`

### Stopping the Studio
Double-click **`stop.bat`** to safely close all background servers.

---

## 🛠️ System Requirements

- **Operating System**: Windows 10 or 11
- **Node.js**: v18 or newer ([Download Node.js](https://nodejs.org/))
- **Python**: 3.10 to 3.14 ([Download Python](https://www.python.org/))
- **FFmpeg & FFprobe**: Installed and added to system PATH ([Download FFmpeg](https://ffmpeg.org/))

---

## 🔑 Setting Up Free API Keys

All keys are stored **strictly in `backend/.env`** and are **never** tracked by Git or exposed in browser code.

### 1. Google Gemini API (AI Editing Planner)
1. Get a free API key at [Google AI Studio](https://aistudio.google.com/).
2. In the NovaCut Studio web browser app, open the **Workspace**.
3. Directly above the prompt box (Step 4), paste your key into the password field and click **Test & Save**.
4. Once verified, a green badge (`● Gemini AI Online`) will show.

### 2. Pixabay API (Free Stock Videos & Photos)
1. Create a free account at [Pixabay](https://pixabay.com/) and copy your API key from the API documentation.
2. In NovaCut Studio, go to **Settings > Stock Media**.
3. Paste your key into the **Pixabay API Key** field and click **Save Stock Media Keys**.
4. You can now search free stock footage inside the app and have AI automatically insert B-roll cutaways!

*(Note: Pexels API key is optional and can be left empty since Pexels paused issuing new keys).*

---

## 🎵 Adding Background Music

1. Navigate to **Settings > Music Library**.
2. Click **Upload Music Track** and select any `.mp3`, `.wav`, or `.m4a` file.
3. Enter the track title and assign mood tags (e.g., `upbeat`, `cinematic`, `chill`, `inspirational`).
4. When rendering videos with background music enabled, NovaCut **automatically ducks the music volume** whenever someone speaks in your footage!

---

## 🧼 System Maintenance & Storage

Under **Settings > System & Storage**, you can:
- **Run System Check**: Verifies database connection, FFmpeg version, Python runtime, Whisper model, ONNX segmentation model, and API keys.
- **Clean Preview Cache**: Cleans temporary scratch files and low-resolution preview images to reclaim disk space with 1 click. **Guaranteed safe**: Raw footage and exported videos are never deleted.
- **Create Instant Backup**: Creates a timestamped `.zip` archive inside `backend/backups/` containing your database (`dev.db`), project configurations (`project.json`), and Gemini editing plans.

---

## 🧪 Running the Smoke Test

To verify that your entire workstation is 100% operational:
```bash
npm --prefix backend run smoke
```
This tests:
- System diagnostics & external APIs
- 1 automated photo edit (smart crop, color levels, warm filter)
- 1 draft video render with FFmpeg and ffprobe validation

---

## ❓ 5 Common Problems & Fast Fixes

### 1. Port 3001 or 5173 is already in use (`EADDRINUSE`)
- **Cause**: An old server process is still running in the background.
- **Fix**: Double-click `stop.bat` to terminate lingering processes, or open Task Manager and end any rogue `node.exe` tasks.

### 2. Gemini AI Shows "Offline"
- **Cause**: Missing API key or slow internet connection during verification.
- **Fix**: Open the Workspace page, click **Change Key**, re-paste your key, and click **Test & Save**. Check that your internet can reach `generativelanguage.googleapis.com`.

### 3. Video Render Fails with "FFmpeg not found"
- **Cause**: FFmpeg is not installed or not in your Windows system PATH.
- **Fix**: Download FFmpeg Gyan build, extract it, and add the `bin` folder to your Windows System Environment Variables PATH. Verify by opening a new terminal and typing `ffmpeg -version`.

### 4. Subtitle Transcription Python Error (`metadata_errors`)
- **Cause**: Outdated Python dependency or version mismatch with `ctranslate2`.
- **Fix**: Ensure your Python worker virtual environment has compatible packages:
  ```bash
  pip install --upgrade faster-whisper
  ```

### 5. Low Disk Space Warning (< 10 GB)
- **Cause**: Video rendering scratch files or preview cache accumulation.
- **Fix**: Open **Settings > System & Storage** and click **Clean Preview & Temp Cache**. You can also move completed projects from `backend/storage/clients/` to an external hard drive.

---

## 📁 Storage Architecture

All user data stays strictly local in `backend/storage/`:
```
backend/storage/
├── clients/              # Client & project workspaces
│   └── <ClientName>/
│       └── <ProjectId>/
│           ├── raw/      # Raw uploaded media (NEVER touched by cleanup)
│           ├── previews/ # Lightweight proxy previews (safe to clean)
│           ├── exports/  # Rendered finished MP4s and photos (NEVER touched)
│           ├── plans/    # AI editing plans (plan_v1.json, etc.)
│           └── project.json
├── brand/                # Brand kit logo, typography & watermarks
├── music-library/        # Background audio tracks with mood metadata
├── models/               # Local AI models (u2netp.onnx)
└── temp/                 # Temporary render scratch space (safe to clean)
```
