# YAP. — AI Portfolio Content Engine

> **Transform raw code repositories into enterprise-grade READMEs and high-converting executive social proof in seconds.**

## 💡 Why This Exists

Top 1% engineers often suffer from mediocre personal positioning. Writing high-impact READMEs and technical posts takes valuable focus away from shipping code. **YAP!** bridges this gap by directly ingesting GitHub repositories, extracting core architectural context, and generating production-ready documentation and LinkedIn content tuned to distinct tone profiles.

---

## ⚡ Key Features

- **Dual-Path Repo Streamer:** Blazing-fast tarball memory extraction with a multi-threaded (`ThreadPoolExecutor`) REST API fallback for private/public GitHub repositories.
- **Context-Aware Payload Trimming:** Smart filtering pipeline that strips heavy dependencies (`node_modules`, lockfiles, binaries) to maximize LLM context efficiency under 30,000 characters.
- **Resilient AI Pipeline:** Built on top of the modern `google-genai` SDK with auto-retry mechanisms for transient 503/UNAVAILABLE service errors.
- **Multi-Vibe Content Engine:** Tailor social positioning using distinct engines: `Corporate Alpha`, `Tech Influencer`, and `Humblebrag`.
- **Neo-Brutalist UX:** High-contrast, zero-latency SPA state machine built for rapid workflow execution.
- **Cloud-Native Architecture:** Pre-configured Docker container optimized for single-worker/multi-thread deployment on Google Cloud Run or Vercel.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.12, Flask 3.1, Gunicorn
- **LLM Engine:** Google Gemini AI API (`google-genai` SDK)
- **Data Ingestion:** GitHub REST API v3, Tarball Gzip Streaming
- **Frontend:** HTML5, Neo-Brutalist CSS Engine, Vanilla JS State Machine
- **Deployment:** Docker, Google Cloud Run, Vercel Serverless

---

## 🚀 Quick Start

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/yap.git
   cd yap
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GITHUB_TOKEN=your_github_pat_here # Optional, increases rate limits
   PORT=8080
   ```

3. **Install Dependencies & Run:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python app.py
   ```
   Navigate to `http://localhost:8080` in your browser.

### Docker Deployment

```bash
docker build -t yap-app .
docker run -p 8080:8080 -e GEMINI_API_KEY=your_key_here yap-app
```