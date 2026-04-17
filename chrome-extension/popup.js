'use strict';

// ─── IndexedDB helpers (for persisting FileSystemDirectoryHandle) ─────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('llm-wiki-db', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('handles');
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('handles', 'readonly').objectStore('handles').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// ─── File System Access API helpers ──────────────────────────────────────────

async function ensurePermission(handle) {
  const opts = { mode: 'readwrite' };
  if (await handle.queryPermission(opts) === 'granted') return true;
  return await handle.requestPermission(opts) === 'granted';
}

async function readFile(dirHandle, filename) {
  try {
    const fh = await dirHandle.getFileHandle(filename);
    const file = await fh.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

async function writeFile(dirHandle, filename, content) {
  const fh = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fh.createWritable();
  await writable.write(content);
  await writable.close();
}

async function listMdFiles(dirHandle) {
  const files = [];
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.md')) {
      files.push(entry.name);
    }
  }
  return files;
}

// ─── Claude API ───────────────────────────────────────────────────────────────

async function callClaude(apiKey, model, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Claude returned an empty response');

  try {
    return JSON.parse(text);
  } catch {
    // Strip markdown code fences if present
    const stripped = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(stripped);
  }
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildIngestPrompt(url, title, content, existingIndex) {
  const today = new Date().toISOString().split('T')[0];
  return `You are maintaining a personal LLM wiki. Create a concise wiki article for a web page.

EXISTING WIKI INDEX (index.md):
${existingIndex || '# Wiki Index\n\n## Articles\n(none yet)'}

PAGE TO INGEST:
URL: ${url}
Title: ${title}
Date: ${today}
Content:
${content.slice(0, 15000)}

Return ONLY a valid JSON object with these exact fields:
{
  "filename": "kebab-case-slug.md",
  "title": "Human readable article title",
  "article": "Full markdown content of the article",
  "index_entry": "- [Title](filename.md) — one-line summary under 100 chars",
  "log_entry": "${today} | Ingested: [Title](filename.md) | ${url}"
}

The article markdown must follow this structure:

# Article Title

## Summary
2–3 sentence synthesis (not copy-paste).

## Key Points
- Key point
- Key point

## Details
Relevant depth, organized with subheadings if needed.

## Source
- [${title}](${url})

## Related
(Links to related wiki pages from the existing index above, if any match)

---
*Added: ${today}*

Rules:
- filename: lowercase, hyphens only, .md extension, concise (3–5 words)
- If a page for this URL already exists in the index, reuse its filename
- Link to existing related pages using [Title](filename.md) syntax
- Keep the article as a synthesis, not a transcript`;
}

function buildLintPrompt(files) {
  const today = new Date().toISOString().split('T')[0];
  const fileList = files.map(f => `### FILE: ${f.name}\n${f.content}`).join('\n\n---\n\n');
  return `You are maintaining a personal LLM wiki. Perform a quality audit on ${today}.

WIKI FILES:
${fileList}

Return ONLY a valid JSON object:
{
  "summary": "2–3 sentence overall health assessment",
  "issues": [
    {
      "type": "broken_link | orphaned | missing_cross_ref | contradiction | quality",
      "file": "filename.md",
      "description": "Clear description of the issue"
    }
  ],
  "fixes": [
    {
      "filename": "filename.md",
      "content": "Complete corrected markdown content for this file"
    }
  ],
  "suggestions": ["Topic worth adding to the wiki", "Another suggestion"]
}

Audit for:
1. Broken internal links (links to .md files not present in the file list)
2. Orphaned pages (not linked from index.md or any other page)
3. Missing cross-references between clearly related pages
4. Factual contradictions between pages
5. index.md entries pointing to files that don't exist

Only include fixes for clear, objective issues — not stylistic preferences.
For fixes, include the complete file content, not a diff.`;
}

// ─── Wiki operations ──────────────────────────────────────────────────────────

async function ingestPage(dirHandle, apiKey, model) {
  // Extract page content from active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found');

  let pageInfo;
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const mainEl =
          document.querySelector('article') ||
          document.querySelector('main') ||
          document.querySelector('[role="main"]') ||
          document.body;
        return {
          title: document.title,
          url: location.href,
          content: (mainEl || document.body).innerText
        };
      }
    });
    pageInfo = results[0].result;
  } catch (e) {
    throw new Error(`Cannot read this page: ${e.message}`);
  }

  const { title, url, content } = pageInfo;

  // Read existing index
  const existingIndex = await readFile(dirHandle, 'index.md');

  // Call Claude
  const prompt = buildIngestPrompt(url, title, content, existingIndex);
  const result = await callClaude(apiKey, model, prompt);

  if (!result.filename || !result.article || !result.index_entry || !result.log_entry) {
    throw new Error('Claude returned incomplete article data');
  }

  // Write article file
  await writeFile(dirHandle, result.filename, result.article);

  // Update index.md — remove stale entry for same file, then insert fresh one
  let index = existingIndex || '# Wiki Index\n\n## Articles\n';
  const lines = index.split('\n').filter(l => !l.includes(`(${result.filename})`));
  const articlesIdx = lines.findIndex(l => /^##\s+articles/i.test(l.trim()));
  if (articlesIdx !== -1) {
    lines.splice(articlesIdx + 1, 0, result.index_entry);
  } else {
    lines.push('', '## Articles', result.index_entry);
  }
  await writeFile(dirHandle, 'index.md', lines.join('\n'));

  // Append to log.md
  const log = await readFile(dirHandle, 'log.md') || '# Wiki Log\n';
  await writeFile(dirHandle, 'log.md', log + '\n' + result.log_entry);

  // Increment ingest count
  const { ingestCount = 0 } = await chrome.storage.local.get('ingestCount');
  await chrome.storage.local.set({ ingestCount: ingestCount + 1 });

  return result;
}

async function runLint(dirHandle, apiKey, model) {
  const filenames = await listMdFiles(dirHandle);
  if (filenames.length === 0) throw new Error('No wiki files found to lint');

  const files = await Promise.all(
    filenames.map(async name => ({ name, content: await readFile(dirHandle, name) || '' }))
  );

  const result = await callClaude(apiKey, model, buildLintPrompt(files));

  // Apply fixes
  if (Array.isArray(result.fixes)) {
    for (const fix of result.fixes) {
      if (fix.filename && fix.content) {
        await writeFile(dirHandle, fix.filename, fix.content);
      }
    }
  }

  // Log lint run
  const today = new Date().toISOString().split('T')[0];
  const issueCount = result.issues?.length || 0;
  const fixCount = result.fixes?.length || 0;
  const log = await readFile(dirHandle, 'log.md') || '# Wiki Log\n';
  await writeFile(
    dirHandle,
    'log.md',
    log + `\n${today} | Lint: ${issueCount} issues found, ${fixCount} fixed`
  );

  // Reset ingest counter after lint
  await chrome.storage.local.set({ ingestCount: 0 });

  return result;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function setStatus(msg, type = 'info') {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = `status ${type} visible`;
}

function clearStatus() {
  const el = document.getElementById('status');
  el.className = 'status';
}

function setLoading(loading, label = '▶ Ingest This Page') {
  const spinner = document.getElementById('spinner');
  const ingestLabel = document.getElementById('ingest-label');
  const ingestBtn = document.getElementById('ingest-btn');
  const lintBtn = document.getElementById('lint-btn');

  spinner.style.display = loading ? 'inline-block' : 'none';
  ingestLabel.textContent = loading ? 'Working…' : label;
  ingestBtn.disabled = loading;
  lintBtn.disabled = loading;
}

async function updateStats() {
  const { ingestCount = 0, lintEvery = 10 } = await chrome.storage.local.get(['ingestCount', 'lintEvery']);
  const remaining = lintEvery - (ingestCount % lintEvery);
  document.getElementById('ingest-count').textContent = ingestCount;
  document.getElementById('next-lint').textContent = remaining;
}

// ─── Initialisation ───────────────────────────────────────────────────────────

let dirHandle = null;

async function loadStoredHandle() {
  // Only query (no user gesture) — permission is requested lazily on first action.
  const stored = await idbGet('wikiDir');
  if (!stored) return null;
  try {
    // 'granted' persists within a browser session; 'prompt' means we'll ask on click.
    const state = await stored.queryPermission({ mode: 'readwrite' });
    return state !== 'denied' ? stored : null;
  } catch {
    return null;
  }
}

async function showMainSection() {
  document.getElementById('no-folder-section').style.display = 'none';
  document.getElementById('main-section').style.display = 'block';
  document.getElementById('folder-name').textContent = dirHandle.name;
  await updateStats();
}

async function init() {
  dirHandle = await loadStoredHandle();

  if (dirHandle) {
    await showMainSection();
  }

  // Current page info
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      document.getElementById('page-title').textContent = tab.title || 'Unknown page';
      try {
        document.getElementById('page-url').textContent = new URL(tab.url).hostname;
      } catch {
        document.getElementById('page-url').textContent = tab.url || '';
      }
    }
  } catch { /* ignore — might be a restricted page */ }

  // ── Setup nudge button (no folder configured yet) ─────────────────────────
  document.getElementById('setup-settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // ── Ingest button ──────────────────────────────────────────────────────────
  document.getElementById('ingest-btn').addEventListener('click', async () => {
    const { apiKey, model = 'claude-haiku-4-5-20251001' } = await chrome.storage.local.get(['apiKey', 'model']);

    if (!apiKey) {
      setStatus('API key not set — open Settings.', 'error');
      return;
    }

    // Request permission here — inside a click handler, so user gesture is present.
    const permitted = await ensurePermission(dirHandle);
    if (!permitted) {
      setStatus('Folder access denied. Re-select the folder in Settings.', 'error');
      return;
    }

    clearStatus();
    document.getElementById('lint-summary').className = 'lint-summary';
    setLoading(true);
    setStatus('Reading page & calling Claude…', 'info');

    try {
      const result = await ingestPage(dirHandle, apiKey, model);
      setStatus(`Saved: ${result.filename}`, 'success');
      await updateStats();

      // Auto-lint check
      const { ingestCount = 0, lintEvery = 10 } = await chrome.storage.local.get(['ingestCount', 'lintEvery']);
      if (ingestCount > 0 && ingestCount % lintEvery === 0) {
        setStatus('Auto-running lint…', 'info');
        try {
          const lintResult = await runLint(dirHandle, apiKey, model);
          const issues = lintResult.issues?.length || 0;
          const fixes = lintResult.fixes?.length || 0;
          setStatus(`Ingested + auto-linted. ${issues} issues, ${fixes} fixed.`, 'success');
          if (lintResult.summary) {
            const summaryEl = document.getElementById('lint-summary');
            summaryEl.textContent = lintResult.summary;
            summaryEl.className = 'lint-summary visible';
          }
          await updateStats();
        } catch (e) {
          setStatus(`Ingested. Auto-lint failed: ${e.message}`, 'error');
        }
      }
    } catch (e) {
      setStatus(`Error: ${e.message}`, 'error');
    }

    setLoading(false);
  });

  // ── Lint button ────────────────────────────────────────────────────────────
  document.getElementById('lint-btn').addEventListener('click', async () => {
    const { apiKey, model = 'claude-haiku-4-5-20251001' } = await chrome.storage.local.get(['apiKey', 'model']);

    if (!apiKey) {
      setStatus('API key not set — open Settings.', 'error');
      return;
    }

    const permitted = await ensurePermission(dirHandle);
    if (!permitted) {
      setStatus('Folder access denied. Re-select the folder in Settings.', 'error');
      return;
    }

    clearStatus();
    setLoading(true);
    setStatus('Running lint…', 'info');

    try {
      const result = await runLint(dirHandle, apiKey, model);
      const issues = result.issues?.length || 0;
      const fixes = result.fixes?.length || 0;
      setStatus(`Lint done. ${issues} issues found, ${fixes} fixed.`, issues ? 'error' : 'success');
      if (result.summary) {
        const summaryEl = document.getElementById('lint-summary');
        summaryEl.textContent = result.summary;
        summaryEl.className = 'lint-summary visible';
      }
      await updateStats();
    } catch (e) {
      setStatus(`Lint error: ${e.message}`, 'error');
    }

    setLoading(false);
  });

  // ── Settings button ────────────────────────────────────────────────────────
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

document.addEventListener('DOMContentLoaded', init);
