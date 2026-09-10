import { openOrFocusApp } from './src/openApp';

const openButton = document.getElementById('open-app');
const closeButton = document.getElementById('close-popup');

openButton?.addEventListener('click', () => {
  void openOrFocusApp().then(() => window.close());
});

// 2026-09-10, on direct request, alongside the switch to a persistent
// chrome.windows.create window (see openPopupWindow.ts) — window.close()
// works from a normal extension window's own page script the same way it
// would from a tab; this is the ONLY way this window closes now (Chrome
// no longer auto-closes it on an outside click, unlike the old
// default_popup overlay).
closeButton?.addEventListener('click', () => {
  window.close();
});
