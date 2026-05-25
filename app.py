"""
YAP! — Portfolio Dashboard
Flask backend: GitHub repo filtering + Gemini AI generation
"""

import os
import re
import json
import base64
import logging
from urllib.parse import urlparse

import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai
from google.genai import types

# ─── Setup ───────────────────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# ─── Constants ───────────────────────────────────────────────────────────────

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# File extensions we want to READ from GitHub
ALLOWED_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".html", ".css", ".scss",
    ".md", ".txt", ".rst",
    ".json", ".yaml", ".yml", ".toml",
    ".env.example", ".sh", ".sql",
    ".go", ".rs", ".java", ".kt", ".swift", ".c", ".cpp", ".h",
    ".r", ".ipynb",
}

# Path segments that are ALWAYS denied
DENY_PATH_SEGMENTS = {
    "node_modules", ".venv", "venv", "__pycache__", ".git",
    "dist", "build", ".next", ".nuxt", "coverage", ".cache",
    "vendor", "target", "bin", "obj", "out", ".idea", ".vscode",
}

# Binary / media extensions we never read
DENY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".mp4", ".mp3", ".wav", ".pdf", ".zip", ".tar", ".gz",
    ".exe", ".dll", ".so", ".dylib", ".wasm",
    ".ttf", ".otf", ".woff", ".woff2", ".eot",
    ".lock",  # lockfiles are massive and useless for context
}

# Files to prioritise when fetching (loaded first)
PRIORITY_FILES = [
    "main.py", "app.py", "index.py", "server.py", "run.py",
    "requirements.txt", "package.json", "pyproject.toml", "setup.py",
    "README.md", "readme.md", "README.rst",
    "Makefile", "docker-compose.yml", "docker-compose.yaml",
]

MAX_PAYLOAD_CHARS = 30_000


# ─── Utility ─────────────────────────────────────────────────────────────────

def parse_github_url(url: str) -> tuple[str, str] | None:
    """Extract (owner, repo) from a GitHub URL. Returns None on failure."""
    url = url.strip().rstrip("/")
    # Normalise: https://github.com/owner/repo[/anything]
    patterns = [
        r"github\.com[/:]([^/]+)/([^/.\s]+)",
    ]
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return m.group(1), m.group(2).removesuffix(".git")
    return None


def is_allowed_file(path: str) -> bool:
    """True if the repo file path is safe to fetch."""
    parts = path.lower().split("/")
    # Deny if any segment is in the deny set
    for seg in parts:
        if seg in DENY_PATH_SEGMENTS:
            return False
    # Check extension
    name = parts[-1]
    ext = os.path.splitext(name)[1].lower()
    if ext in DENY_EXTENSIONS:
        return False
    if ext in ALLOWED_EXTENSIONS:
        return True
    # Files without extensions that are still useful (Makefile, Dockerfile, etc.)
    if name in {"makefile", "dockerfile", "procfile", "gemfile", "rakefile"}:
        return True
    return False


def github_headers() -> dict:
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


def fetch_github_repo(owner: str, repo: str) -> dict:
    """
    Fetch filtered repository content from GitHub REST API.
    Returns {"content": str, "files_read": list, "truncated": bool}
    """
    base = f"https://api.github.com/repos/{owner}/{repo}"

    # 1. Get the default branch
    repo_resp = requests.get(base, headers=github_headers(), timeout=10)
    if repo_resp.status_code == 404:
        raise ValueError(f"Repository {owner}/{repo} not found or is private.")
    repo_resp.raise_for_status()
    repo_data = repo_resp.json()
    default_branch = repo_data.get("default_branch", "main")

    # 2. Get the full file tree (recursive)
    tree_resp = requests.get(
        f"{base}/git/trees/{default_branch}?recursive=1",
        headers=github_headers(),
        timeout=15,
    )
    tree_resp.raise_for_status()
    tree = tree_resp.json().get("tree", [])

    # 3. Filter to allowed blobs only
    blobs = [
        item for item in tree
        if item.get("type") == "blob" and is_allowed_file(item["path"])
    ]

    # 4. Sort: priority files first, then by size ascending (grab smaller files more easily)
    def sort_key(item):
        name = os.path.basename(item["path"])
        try:
            priority_idx = PRIORITY_FILES.index(name)
        except ValueError:
            priority_idx = len(PRIORITY_FILES)
        return (priority_idx, item.get("size", 9999999))

    blobs.sort(key=sort_key)

    # 5. Fetch file contents until char limit
    collected: list[str] = []
    files_read: list[str] = []
    total_chars = 0
    truncated = False

    for blob in blobs:
        if total_chars >= MAX_PAYLOAD_CHARS:
            truncated = True
            break
        path = blob["path"]
        file_resp = requests.get(
            f"{base}/contents/{path}?ref={default_branch}",
            headers=github_headers(),
            timeout=10,
        )
        if file_resp.status_code != 200:
            continue
        file_data = file_resp.json()
        encoding = file_data.get("encoding", "")
        raw_content = file_data.get("content", "")

        if encoding == "base64":
            try:
                text = base64.b64decode(raw_content).decode("utf-8", errors="replace")
            except Exception:
                continue
        else:
            text = raw_content

        remaining = MAX_PAYLOAD_CHARS - total_chars
        if len(text) > remaining:
            text = text[:remaining]
            truncated = True

        block = f"### FILE: {path}\n```\n{text}\n```\n\n"
        collected.append(block)
        files_read.append(path)
        total_chars += len(text)

    return {
        "content": "".join(collected),
        "files_read": files_read,
        "truncated": truncated,
        "repo_name": repo,
        "owner": owner,
    }


# ─── Gemini Generation ───────────────────────────────────────────────────────

VIBE_DESCRIPTIONS = {
    "humblebrag": (
        "Write with charming self-deprecating humor — acknowledge the messy parts "
        "but cleverly spin them into relatable wins. Modest tone, but the achievements "
        "still shine through. Witty, not cringe."
    ),
    "tech-influencer": (
        "Write in a high-energy, emoji-heavy, viral tech influencer style. Use bold "
        "hooks, hot takes, and punchy short sentences. Make readers feel like they're "
        "missing out if they don't star this repo. Include relevant emojis throughout."
    ),
    "corporate-alpha": (
        "Write in a results-driven, C-suite corporate style. Lead with quantified "
        "impact and business outcomes. Use power verbs (Architected, Engineered, "
        "Delivered, Scaled). Pepper in buzzwords like 'scalable', 'production-grade', "
        "'end-to-end'. Professional and commanding."
    ),
}

SYSTEM_PROMPT = """You are YAP! — an AI portfolio content engine. Your persona is a brutally honest 
senior developer who writes hype-worthy, technically credible portfolio content.

You always respond with ONLY a valid JSON object with two keys:
1. "readme_md" — a complete, well-structured GitHub README in Markdown format
2. "linkedin_post" — a social media post ready to copy-paste

The README should include:
- A punchy project title + one-liner description
- What problem this solves (Why This Exists)
- Key features (as bullets)
- Tech Stack section
- Quick Start / How to Run
- Screenshots/Demo section (placeholder link ok)

The LinkedIn post should be 150-250 words, no hashtag spam (max 5 relevant hashtags).
"""


def build_prompt(
    code_content: str,
    questionnaire: dict,
    vibe: str,
    repo_name: str = "",
) -> str:
    vibe_desc = VIBE_DESCRIPTIONS.get(vibe.lower(), VIBE_DESCRIPTIONS["humblebrag"])

    q_lines = []
    if questionnaire.get("problem"):
        q_lines.append(f"PROBLEM SOLVED: {questionnaire['problem']}")
    if questionnaire.get("category"):
        q_lines.append(f"PROJECT CATEGORY: {questionnaire['category']}")
    if questionnaire.get("experimental_detail"):
        q_lines.append(f"EXPERIMENTAL DETAIL: {questionnaire['experimental_detail']}")
    if questionnaire.get("tech_stack"):
        q_lines.append(f"TECH STACK: {questionnaire['tech_stack']}")

    questionnaire_text = "\n".join(q_lines) if q_lines else "(User skipped the questionnaire)"

    prompt_parts = []
    prompt_parts.append(f"## CONTEXT FROM DEVELOPER\n{questionnaire_text}\n")

    if repo_name:
        prompt_parts.append(f"## REPOSITORY NAME\n{repo_name}\n")

    if code_content:
        prompt_parts.append(f"## CODE CONTENT\n{code_content}\n")
    else:
        prompt_parts.append("## CODE CONTENT\n(No code provided — generate based on context only)\n")

    prompt_parts.append(
        f"## LINKEDIN POST VIBE\n{vibe_desc}\n"
        f"\nGenerate the JSON output now. README first, LinkedIn post second. "
        f"Make it impressive. No markdown fences around the JSON itself."
    )

    return "\n".join(prompt_parts)


def call_gemini(prompt: str) -> dict:
    """Call Gemini API and return parsed JSON output."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")

    client = genai.Client(api_key=GEMINI_API_KEY)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.85,
            max_output_tokens=4096,
        ),
    )

    raw_text = response.text.strip()

    # Strip any accidental markdown fences
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text)
        raw_text = re.sub(r"\n?```$", "", raw_text.strip())

    return json.loads(raw_text)


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/fetch-github", methods=["POST"])
def api_fetch_github():
    data = request.get_json(force=True, silent=True) or {}
    url = (data.get("url") or "").strip()

    if not url:
        return jsonify({"error": "GitHub URL is required."}), 400

    parsed = parse_github_url(url)
    if not parsed:
        return jsonify({"error": "Invalid GitHub URL. Expected format: https://github.com/owner/repo"}), 400

    owner, repo = parsed

    try:
        result = fetch_github_repo(owner, repo)
        return jsonify({
            "success": True,
            "owner": result["owner"],
            "repo": result["repo_name"],
            "files_read": result["files_read"],
            "file_count": len(result["files_read"]),
            "truncated": result["truncated"],
            "content": result["content"],
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response else 500
        if status == 403:
            return jsonify({"error": "GitHub rate limit exceeded. Add a GITHUB_TOKEN env var to increase limits."}), 429
        return jsonify({"error": f"GitHub API error: {status}"}), status
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Cannot reach GitHub. Check your internet connection."}), 503
    except Exception as e:
        logger.exception("Unexpected error fetching GitHub repo")
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500


@app.route("/api/generate", methods=["POST"])
def api_generate():
    data = request.get_json(force=True, silent=True) or {}

    code_content = (data.get("code_content") or "").strip()
    questionnaire = data.get("questionnaire") or {}
    vibe = (data.get("vibe") or "humblebrag").strip().lower()
    repo_name = (data.get("repo_name") or data.get("project_name") or "").strip()

    # Validate vibe
    if vibe not in VIBE_DESCRIPTIONS:
        vibe = "humblebrag"

    if not code_content and not any(questionnaire.values()):
        return jsonify({"error": "No content provided. Add code or fill out the questionnaire."}), 400

    try:
        prompt = build_prompt(code_content, questionnaire, vibe, repo_name)
        result = call_gemini(prompt)

        if "readme_md" not in result or "linkedin_post" not in result:
            raise ValueError("Gemini returned unexpected JSON structure.")

        return jsonify({
            "success": True,
            "readme_md": result["readme_md"],
            "linkedin_post": result["linkedin_post"],
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except json.JSONDecodeError:
        return jsonify({"error": "Gemini returned malformed output. Please try again."}), 502
    except Exception as e:
        logger.exception("Error during generation")
        return jsonify({"error": f"Generation failed: {str(e)}"}), 500


# ─── Health Check ────────────────────────────────────────────────────────────

@app.route("/healthz")
def healthz():
    return jsonify({"status": "ok", "service": "YAP!"})


# ─── Run ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
