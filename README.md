# LLM Wiki

A personal wiki that builds itself from the web pages you visit, curated by Claude AI.

## How it works

1. You browse the web and find something worth keeping
2. Click the **LLM Wiki** Chrome extension on that page
3. Claude reads the page and writes a concise wiki article into your local `wiki/` folder
4. Push to GitHub — your wiki is instantly published as a website via GitHub Pages

The wiki is plain markdown files. You own the data. No accounts, no subscriptions beyond your Claude API key.

---

## Project structure

```
ai_wiki/
├── chrome-extension/   Chrome extension (Manifest V3, no build step)
├── wiki/               Generated markdown articles
│   ├── index.md        Article catalog (auto-maintained by extension)
│   └── log.md          Append-only ingest & lint log
├── index.html          Zen-style wiki viewer (GitHub Pages compatible)
└── serve.bat           One-click local server for Windows
```

---

## Setup

### 1. Get a Claude API key

Sign up at [console.anthropic.com](https://console.anthropic.com) and create an API key.

### 2. Install the Chrome extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked** → select the `chrome-extension/` folder
4. The ◈ icon appears in your toolbar

### 3. Configure the extension

Click the ◈ icon → **⚙ Settings**:

| Setting | Value |
|---|---|
| API Key | Your Claude API key (`sk-ant-…`) |
| Model | Haiku 4.5 (fast/cheap) · Sonnet 4.6 (balanced) · Opus 4.6 (best) |
| Wiki Folder | Select the `wiki/` folder inside this repo |
| Auto-lint every | N ingests (default: 10) |

The folder is selected **once** via a browser picker and remembered. Your API key is stored in Chrome's local extension storage — never written to disk or committed to git.

### 4. Ingest pages

Navigate to any page → click the ◈ extension icon → **▶ Ingest This Page**.

Claude will:
- Synthesize a concise wiki article
- Write it to `wiki/<slug>.md`
- Update `wiki/index.md` and `wiki/log.md`

### 5. Lint

Lint scans all wiki files for broken links, orphaned pages, and contradictions, then auto-fixes what it can.

- **Auto**: runs every N ingests (configured in settings)
- **Manual**: click **⚡ Run Lint Now** in the popup

---

## Viewing the wiki

### Online (GitHub Pages)

Push the repo to GitHub and enable Pages (see steps below). Your wiki is live at:
```
https://<your-username>.github.io/<repo-name>/
```

### Locally

Double-click `serve.bat`, or run:
```bash
python -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000).

The viewer auto-loads `wiki/index.md` and opens the first article. Use the sidebar to navigate, search, or toggle dark mode.

---

## Publishing to GitHub Pages

See the setup steps below. Once configured, every `git push` automatically updates your live wiki.

1. Go to your repo on GitHub → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` · Folder: `/ (root)`
4. Click **Save** — your site will be live at `https://<username>.github.io/<repo>/`

---

## Security notes

- **API key** is stored in `chrome.storage.local` (browser extension storage). It is never written to any file in this repo and will never be committed.
- **Wiki articles** are plain markdown and are intentionally committed — they are the content of your wiki.
- The `.gitignore` blocks common secret file patterns (`.env`, `*.key`, etc.) as an extra safeguard.
