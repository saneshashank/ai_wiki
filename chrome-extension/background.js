// Minimal service worker — state is managed via chrome.storage.local in popup.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    ingestCount: 0,
    lintEvery: 10,
    model: 'claude-haiku-4-5-20251001'
  });
});
