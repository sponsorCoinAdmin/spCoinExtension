// File: src/contentScript.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E6 / table row 18) -- the bridge between a web page and the wallet. It runs in the page's tab in
// the extension's own (isolated) world: the page cannot read it, and it cannot be given the wallet's keys because it never has them. It does two
// things only: pass each request the page's provider (inpage.ts) makes to the background worker, and pass the worker's answers and events back.
// Who is asking is decided by the worker from the tab (sender.origin), never from anything in the message.

const FROM_PAGE = 'merit-wallet-page';
const TO_PAGE = 'merit-wallet-extension';

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as { target?: string; id?: number; method?: unknown; params?: unknown } | null;
  if (!data || data.target !== FROM_PAGE || typeof data.id !== 'number' || typeof data.method !== 'string') return;
  const id = data.id;
  chrome.runtime
    .sendMessage({ type: 'merit/provider/request', method: data.method, params: data.params })
    .then((reply: { ok: boolean; result?: unknown; error?: { code: number; message: string } } | undefined) => {
      window.postMessage({ target: TO_PAGE, type: 'response', id, ok: !!reply?.ok, result: reply?.result, error: reply?.error }, '*');
    })
    .catch((error: unknown) => {
      window.postMessage({ target: TO_PAGE, type: 'response', id, ok: false, error: { code: -32603, message: error instanceof Error ? error.message : 'The wallet is not available.' } }, '*');
    });
});

chrome.runtime.onMessage.addListener((message: { type?: string; event?: string; data?: unknown }) => {
  if (message?.type === 'merit/provider/event' && typeof message.event === 'string') {
    window.postMessage({ target: TO_PAGE, type: 'event', event: message.event, data: message.data }, '*');
  }
  return false;
});
