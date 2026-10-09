# AIoT Master Guide — Interactive Web App & In-Browser RAG

A high-performance, mobile-first Progressive Web Application (PWA) built from **AIoT_Master_Guide_FINAL_v2.pdf** (163 pages). It delivers a tactile, interactive guide experience with 60fps animations, synthesized Web Audio sound, Android Chrome haptic vibration, and a client-side hybrid RAG assistant running fully in the browser.

---

## ✨ Features & Architecture

- **Mobile-First Experience**: Designed specifically for Android Chrome viewports (360px–412px) with responsive two-column desktop layouts (>=1024px).
- **Structure-Aware Parent-Child Chunking**:
  - Code blocks (`python`, `bash`, `yaml`), BOM tables, and wiring pinouts are preserved intact in parent chunks (`parentText`).
  - Child search chunks capture precise function headers, component lists, and semantic context with automatic parent linking.
  - Video transcripts segmented into sliding ~60s windows with timestamped seek markers.
- **Hybrid Retrieval Engine (RRF + MMR)**:
  - **BM25 Keyword Search** via MiniSearch with customized stopword filtering and term boosting.
  - **384-dimensional Dense Embeddings** via `@xenova/transformers` (`all-MiniLM-L6-v2` ONNX quantized).
  - **Reciprocal Rank Fusion (RRF)**: Merges dense similarity and sparse BM25 scores with smoothing parameter $k=60$.
  - **Maximal Marginal Relevance (MMR)**: Re-ranks candidates for semantic diversity ($\lambda=0.7$) to eliminate repetitive passages.
  - **Calibrated Abstention Rule**: Triggers `"Not found in the guide or videos"` and suggests relevant topics when queries fall outside the corpus (`similarity < 0.28` and `BM25 < 40.0`).
- **Client-Side Memory & IndexedDB (Dexie)**:
  - Persistent chat threads, messages, and citations saved across sessions.
  - User preferences (audio volume, vibration toggles, WebGPU settings) persisted in IndexedDB.
  - In-memory and IndexedDB query cache (LRU up to 200 items) for instantaneous repeated searches.
- **In-Browser AI Assistant**:
  - Interactive bracketed citations (`[1]`, `[2]`) that expand or jump directly to the verified passage.
  - Action cards for one-tap follow-ups (*"Quiz Me"*, *"Troubleshoot Wiring"*, *"Explain Line by Line"*).
  - Streaming generation controls with instant cancellation and WebGPU hardware fallback.
- **Diagnostics Dashboard (`/debug`)**:
  - Inspect manifest integrity, chunk count, WebGPU acceleration status, Service Worker registration, and Audio/Haptic capabilities.
  - Live in-browser RAG sanity test with real-time latency measurement.
- **Tactile Android Haptics & Web Audio**:
  - Zero-download Web Audio synthesizer (clicks, chimes, grounding hum).
  - Android Chrome `navigator.vibrate` integration with scroll-suppression.
- **100% Free & Serverless**: Zero paid APIs, no server required, offline-first PWA caching via Workbox service workers.

---

## 🚀 Quick Start (Windows 11 PowerShell)

### Prerequisites
- Node.js v20+ (Node v24 recommended)
- Python 3.10+ (for PDF parser)

### Exact PowerShell Commands to Run

```powershell
# 1. Clone or navigate to the repository
cd C:\Users\peche\aiot-guide-site

# 2. Install dependencies
npm install

# 3. (Optional) Run incremental ingestion pipeline
npm run ingest

# 4. Start local development server
npm run dev

# 5. Build production bundle with PWA service worker
npm run build

# 6. Run automated test suites
npm run test:rag          # 20-question golden RAG benchmark & abstention tests
npm run test:retrieval    # Chunker & retrieval unit tests
npm run lint              # Fast linting via oxlint
```

---

## 🧪 Testing & Verification

### Golden Test Suite (`npm run test:rag`)
Evaluates 20 target questions across hardware, pinouts, code snippets, protocols, algorithms, and video transcripts:
- **Target Recall@5 Metric**: $\ge 90\%$ (Achieved: **100.0%** across 20 test vectors).
- **Abstention Accuracy**: Verified 100% rejection on out-of-domain queries (e.g., baking recipes, dog training).

### Mobile E2E Headless Test (`node scripts/test_mobile_e2e.mjs`)
Launches Edge headless at 390×844 (Android Chrome emulation):
- Asserts zero console errors across Home, Projects, Roadmap, Ask, Progress, and Debug tabs.
- Captures automated visual artifacts in the conversation artifact directory.

---

## 📚 How to Add Docs & Videos ("Rebuild Knowledge")

### 1. Adding New Documents
Place any `.pdf`, `.md`, or `.txt` files in `data/docs/`:
- `data/docs/AIoT_Master_Guide_FINAL_v2.pdf`
- `data/docs/Project1_StarterPack_SmartTempMonitor.pdf`

### 2. Adding Video Resources
Add YouTube video URLs directly to `data/videos.txt` (one URL per line):
```text
https://www.youtube.com/watch?v=8AWEPx5cHWQ
https://www.youtube.com/watch?v=aimSGOAUI8Y
```

### 3. Manual Transcript Fallbacks
If a video has captions disabled by the creator, place a manual text transcript in `data/transcripts/<videoId>.txt`:
```text
data/transcripts/BO7DVnN9ctk.txt
```

### 4. Incremental Ingestion
Run the ingestion pipeline:
```powershell
npm run ingest
```
The script hashes document contents and skips embedding unchanged sections, updating:
- `public/rag-index/chunks.json` (Structured parent-child chunks)
- `public/rag-index/embeddings.bin` (384-dimensional Float32 byte buffer)
- `public/rag-index/minisearch-index.json` (BM25 inverted index)
- `public/rag-index/manifest.json` (Integrity metadata and hash)

---

## 🌐 100% Free Static Deployment

### Base Path Configuration
The application is preconfigured with relative asset paths (`./`) in `vite.config.ts` and `src/workers/rag.worker.ts`.
For GitHub Pages subdirectories (e.g., `https://username.github.io/aiot-guide-site/`):
```powershell
$env:VITE_BASE = "/aiot-guide-site/"
npm run build
```
Or for custom root domains (e.g. Cloudflare Pages or Vercel), leave default `VITE_BASE="./"`.

### Option A: Cloudflare Pages (Recommended)
1. Push your repository to GitHub.
2. In the Cloudflare dashboard, go to **Workers & Pages** -> **Create application** -> **Pages**.
3. Connect your GitHub repository.
4. Set Build Settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**. Your PWA is live with HTTPS and worldwide CDN!

### Option B: GitHub Pages
1. Install `gh-pages`:
   ```powershell
   npm install -D gh-pages
   ```
2. In `package.json`, add `"deploy": "npm run build && gh-pages -d dist"`.
3. Set your repository name base path if needed and run:
   ```powershell
   npm run deploy
   ```

---

## 🔍 Diagnostics View

Navigate to `/debug` (or click **Diagnostics** in the navigation header) to access:
- **Index Health**: Chunks count, vector dimensions, and manifest timestamp.
- **Hardware Acceleration**: WebGPU adapter status and device tier.
- **Service Worker Status**: Active cache verification and registration state.
- **Audio & Haptics**: Vibration API availability and Web Audio context state.
- **Interactive Sanity Test**: Live end-to-end retrieval benchmark with query latency measurement.
