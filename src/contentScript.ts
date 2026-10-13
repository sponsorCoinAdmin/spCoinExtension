// File: src/contentScript.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E6 / table row 18) -- the bridge between a web page and the wallet. It runs in the page's tab in
// the extension's own (isolated) world: the page cannot read it, and it cannot be given the wallet's keys because it never has them. It does two
// things only: pass each request the page's provider (inpage.ts) makes to the background worker, and pass the worker's answers and events back.
// Who is asking is decided by the worker from the tab (sender.origin), never from anything in the message.

// 2026-10-12 (docs/connectionDesign.txt item 9): on the app's relay page (and only there) this also carries a request of the extension to MetaMask (inpage.ts asks it) and the answer back.
const RELAY_PATH = '/metamaskRelay.html';
const isRelayPage = () => window.location.pathname === RELAY_PATH;

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

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window || !isRelayPage()) return;
  const d = event.data as { target?: string; id?: unknown; ok?: unknown; result?: unknown; error?: unknown } | null;
  if (!d || d.target !== 'merit-wallet-relay-result' || typeof d.id !== 'number') return;
  void chrome.runtime.sendMessage({ type: 'merit/relay/result', id: d.id, ok: !!d.ok, result: d.result, error: d.error }).catch(() => undefined);
});

chrome.runtime.onMessage.addListener((message: { type?: string; event?: string; data?: unknown; id?: number; method?: string; params?: unknown }) => {
  if (message?.type === 'merit/relay/call' && isRelayPage() && typeof message.id === 'number' && typeof message.method === 'string') {
    window.postMessage({ target: 'merit-wallet-relay', id: message.id, method: message.method, params: message.params }, '*');
    return false;
  }
  if (message?.type === 'merit/provider/event' && typeof message.event === 'string') {
    window.postMessage({ target: TO_PAGE, type: 'event', event: message.event, data: message.data }, '*');
  }
  return false;
});
