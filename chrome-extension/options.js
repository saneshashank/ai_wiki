'use strict';

// ─── IndexedDB helpers (shared with popup.js) ─────────────────────────────────

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

// ─── UI ───────────────────────────────────────────────────────────────────────

async function updateFolderDisplay(handle) {
  const pathEl = document.getElementById('folder-path');
  if (handle) {
    pathEl.textContent = handle.name;
    pathEl.className = 'folder-path set';
  } else {
    pathEl.textContent = 'No folder selected';
    pathEl.className = 'folder-path';
  }
}

async function init() {
  // Load stored settings
  const stored = await chrome.storage.local.get(['apiKey', 'model', 'lintEvery']);

  if (stored.apiKey) {
    document.getElementById('api-key').value = stored.apiKey;
  }

  const model = stored.model || 'claude-haiku-4-5-20251001';
  const modelRadio = document.querySelector(`input[name="model"][value="${model}"]`);
  if (modelRadio) modelRadio.checked = true;
  else document.getElementById('model-haiku').checked = true;

  document.getElementById('lint-every').value = stored.lintEvery ?? 10;

  // Load folder handle
  const handle = await idbGet('wikiDir');
  await updateFolderDisplay(handle);

  // ── Change folder ──────────────────────────────────────────────────────────
  document.getElementById('change-folder-btn').addEventListener('click', async () => {
    try {
      const newHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await idbSet('wikiDir', newHandle);
      await updateFolderDisplay(newHandle);
      showSaveStatus('Folder updated.');
    } catch (e) {
      if (e.name !== 'AbortError') showSaveStatus(`Error: ${e.message}`, true);
    }
  });

  // ── Save settings ──────────────────────────────────────────────────────────
  document.getElementById('save-btn').addEventListener('click', async () => {
    const apiKey = document.getElementById('api-key').value.trim();
    const model = document.querySelector('input[name="model"]:checked')?.value || 'claude-haiku-4-5-20251001';
    const lintEvery = parseInt(document.getElementById('lint-every').value, 10) || 10;

    if (!apiKey) {
      showSaveStatus('API key is required.', true);
      return;
    }

    await chrome.storage.local.set({ apiKey, model, lintEvery });
    showSaveStatus('Saved.');
  });
}

function showSaveStatus(msg, isError = false) {
  const el = document.getElementById('save-status');
  el.textContent = msg;
  el.className = `save-status visible${isError ? ' error' : ''}`;
  setTimeout(() => { el.className = 'save-status'; }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
