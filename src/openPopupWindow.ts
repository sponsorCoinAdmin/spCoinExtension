// File: src/openPopupWindow.ts
//
// Real, persistent extension window — replaces manifest.json's
// action.default_popup (2026-09-10, on direct request: the extension's
// popup must NOT auto-close when clicking outside its boundary). Chrome's
// default_popup is a special overlay Chrome itself force-closes on any
// blur/outside click, with no API to override that — it's a platform
// constraint, not something fixable in this extension's own code. A real
// `chrome.windows.create` window (type: 'popup') has no such behavior:
// it only closes when the user closes it (the X button popup.html now
// has) or navigates away, which is exactly what was asked for — see
// popup.html/popup.ts's own close-button wiring.
//
// Queries live windows for an already-open match rather than tracking a
// window ID in memory — same reasoning as openApp.ts's openOrFocusApp:
// this runs in the background service worker, which Chrome can restart
// at any time, silently discarding any in-memory state. A live query is
// robust to that; a remembered ID would go stale the moment the worker
// restarts and risk spawning a duplicate window.
const POPUP_WINDOW_WIDTH = 340;
const POPUP_WINDOW_HEIGHT = 520;

export async function openOrFocusPopupWindow(): Promise<void> {
  const popupUrl = chrome.runtime.getURL('popup.html');
  const existingWindows = await chrome.windows.getAll({ populate: true, windowTypes: ['popup'] });

  for (const win of existingWindows) {
    const isOurPopup = win.tabs?.some((tab) => tab.url === popupUrl);
    if (isOurPopup && win.id !== undefined) {
      await chrome.windows.update(win.id, { focused: true });
      return;
    }
  }

  await chrome.windows.create({
    url: popupUrl,
    type: 'popup',
    width: POPUP_WINDOW_WIDTH,
    height: POPUP_WINDOW_HEIGHT,
  });
}
