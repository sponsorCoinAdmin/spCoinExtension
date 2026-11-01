// File: src/debugTrace.ts
//
// 2026-10-31 (owner request: "add something in the extension for debugging"): a small trace of what the page -> content script -> worker -> side panel path does, to see where a connect request stalls.
// The worker keeps the lines (and mirrors them to chrome.storage.session so a worker restart does not lose them); the content script and the side panel send theirs to the worker; the side panel's bug button
// (src/debugOverlay.ts) shows them. Import this file in the worker to install its message listener.
const KEY = 'meritDebugTrace';
const MAX_LINES = 200;
let lines: string[] = [];
let loaded: Promise<void> | undefined;

const stamp = () => new Date().toISOString().slice(11, 23);

function load(): Promise<void> {
  if (!loaded) {
    loaded = chrome.storage.session
      .get(KEY)
      .then((stored) => {
        const saved = stored[KEY];
        if (Array.isArray(saved)) lines = [...(saved as string[]), ...lines].slice(-MAX_LINES);
      })
      .catch(() => undefined);
  }
  return loaded;
}

/** Worker side: add one line ("who: what"). Never throws. */
export function trace(who: string, what: string): void {
  lines.push(`${stamp()} ${who}: ${what}`);
  if (lines.length > MAX_LINES) lines = lines.slice(-MAX_LINES);
  void load().then(() => chrome.storage.session.set({ [KEY]: lines })).catch(() => undefined);
}

/** Any other context (content script, side panel): hand a line to the worker. */
export function traceFrom(who: string, what: string): void {
  // chrome.runtime is undefined in a tab whose content script outlived an extension reload: never throw from a trace line
  try {
    void chrome.runtime.sendMessage({ type: 'merit/debug/log', who, what }).catch(() => undefined);
  } catch {
    /* no extension context */
  }
}

// only the worker (no window) keeps and answers the trace; the content script and the side panel import this file for traceFrom only
if (typeof window === 'undefined') chrome.runtime.onMessage.addListener((message: { type?: string; who?: string; what?: string }, _sender, sendResponse) => {
  if (message?.type === 'merit/debug/log' && typeof message.who === 'string' && typeof message.what === 'string') {
    trace(message.who, message.what);
    return false;
  }
  if (message?.type === 'merit/debug/get') {
    void load().then(() => sendResponse({ ok: true, lines }));
    return true;
  }
  if (message?.type === 'merit/debug/clear') {
    lines = [];
    void chrome.storage.session.remove(KEY).catch(() => undefined);
    sendResponse({ ok: true });
    return false;
  }
  return false;
});
