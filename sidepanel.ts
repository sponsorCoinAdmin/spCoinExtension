import { openOrFocusApp } from './src/openApp';

const openButton = document.getElementById('open-app');
const closeButton = document.getElementById('close-sidepanel');

// 2026-09-10, on request (switch from a persistent window to a real
// Chrome side panel — see background.ts's own comment for the full
// reasoning). chrome.sidePanel.close() is the side-panel equivalent of
// window.close() (which doesn't apply here; a side panel isn't a
// separate window object) — confirmed against the official API
// reference. Requires Chrome 141+; caught rather than thrown on an older
// browser, since failing to auto-close silently is a far smaller problem
// than an uncaught rejection breaking the click handler entirely.
const closeSidePanel = () => {
  void chrome.sidePanel
    .close({ windowId: chrome.windows.WINDOW_ID_CURRENT })
    .catch((error) => console.error('Failed to close side panel:', error));
};

openButton?.addEventListener('click', () => {
  void openOrFocusApp().then(() => closeSidePanel());
});

closeButton?.addEventListener('click', () => {
  closeSidePanel();
});
