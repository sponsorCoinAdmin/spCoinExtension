// File: src/inpage.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E6 / table row 18) -- the provider a web page sees, injected into the page's own world. It is a
// standard EIP-1193 provider announced through EIP-6963, so a page that supports wallet discovery finds "spCoin Merit Wallet" next to any other
// wallet WITHOUT this file taking over window.ethereum (it never replaces another wallet's provider). All it does is post each request to
// contentScript.ts and resolve with the answer; it holds no keys and decides nothing.

(() => {
  const w = window as unknown as { __meritWalletInstalled?: boolean };
  if (w.__meritWalletInstalled) return;
  w.__meritWalletInstalled = true;

  const TO_EXTENSION = 'merit-wallet-page';
  const FROM_EXTENSION = 'merit-wallet-extension';

  type Listener = (...args: unknown[]) => void;
  const listeners = new Map<string, Set<Listener>>();
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: unknown) => void }>();
  let counter = 0;

  const emit = (event: string, ...args: unknown[]) => {
    for (const l of Array.from(listeners.get(event) ?? [])) {
      try {
        l(...args);
      } catch {
        // a page listener that throws must not break the others
      }
    }
  };

  const provider = {
    isMeritWallet: true,
    request(args: { method: string; params?: unknown }): Promise<unknown> {
      if (!args || typeof args.method !== 'string') return Promise.reject(Object.assign(new Error('Invalid request.'), { code: -32602 }));
      return new Promise((resolve, reject) => {
        const id = ++counter;
        pending.set(id, { resolve, reject });
        window.postMessage({ target: TO_EXTENSION, id, method: args.method, params: args.params }, '*');
      });
    },
    on(event: string, listener: Listener) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
      return provider;
    },
    removeListener(event: string, listener: Listener) {
      listeners.get(event)?.delete(listener);
      return provider;
    },
    off(event: string, listener: Listener) {
      return provider.removeListener(event, listener);
    },
  };

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window) return;
    const d = event.data as { target?: string; type?: string; id?: number; ok?: boolean; result?: unknown; error?: { code: number; message: string }; event?: string; data?: unknown } | null;
    if (!d || d.target !== FROM_EXTENSION) return;
    if (d.type === 'response' && typeof d.id === 'number') {
      const p = pending.get(d.id);
      if (!p) return;
      pending.delete(d.id);
      if (d.ok) p.resolve(d.result);
      else p.reject(Object.assign(new Error(d.error?.message ?? 'Request failed.'), { code: d.error?.code ?? -32603 }));
    } else if (d.type === 'event' && typeof d.event === 'string') {
      emit(d.event, d.data);
    }
  });

  // 2026-10-12 (docs/connectionDesign.txt item 9): on the app's relay page only, answer the extension's requests to MetaMask (the page has no script of its own). MetaMask is found the EIP-6963 way
  // (rdns io.metamask); a request is passed on as it came and the answer, or MetaMask's error code, goes back through the content script.
  if (window.location.pathname === '/metamaskRelay.html') {
    type Eip1193 = { request(args: { method: string; params?: unknown }): Promise<unknown>; isMetaMask?: boolean; isMeritWallet?: boolean };
    const found: { provider?: Eip1193 } = {};
    window.addEventListener('eip6963:announceProvider', (event) => {
      const detail = (event as CustomEvent<{ info?: { rdns?: string }; provider?: Eip1193 }>).detail;
      if (detail?.info?.rdns === 'io.metamask' && detail.provider) found.provider = detail.provider;
    });
    const findMetaMask = async (): Promise<Eip1193 | undefined> => {
      for (let i = 0; i < 30 && !found.provider; i++) {
        window.dispatchEvent(new Event('eip6963:requestProvider'));
        const legacy = (window as unknown as { ethereum?: Eip1193 }).ethereum;
        if (legacy?.isMetaMask && !legacy.isMeritWallet) found.provider = legacy;
        if (!found.provider) await new Promise((r) => setTimeout(r, 100));
      }
      return found.provider;
    };
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return;
      const d = event.data as { target?: string; id?: number; method?: string; params?: unknown } | null;
      if (!d || d.target !== 'merit-wallet-relay' || typeof d.id !== 'number' || typeof d.method !== 'string') return;
      const id = d.id;
      const answer = (payload: Record<string, unknown>) => window.postMessage({ target: 'merit-wallet-relay-result', id, ...payload }, '*');
      void findMetaMask().then(async (metamask) => {
        if (!metamask) return answer({ ok: false, error: { code: 4900, message: 'MetaMask is not installed in this browser.' } });
        try {
          answer({ ok: true, result: await metamask.request(d.params === undefined ? { method: d.method! } : { method: d.method!, params: d.params }) });
        } catch (error) {
          const e = error as { code?: unknown; message?: unknown } | null;
          answer({ ok: false, error: { code: typeof e?.code === 'number' ? e.code : -32603, message: typeof e?.message === 'string' ? e.message : 'MetaMask refused the request.' } });
        }
      });
    });
  }

  // EIP-6963: announce now and whenever a page asks. rdns is the reverse domain of the project, the stable id pages use to recognise this wallet.
  const info = Object.freeze({
    uuid: '6f5c1a0e-3c7e-4c0a-9a53-5b6f0a7d2c11',
    name: 'spCoin Merit Wallet',
    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNiIgZmlsbD0iIzI0MzA0YSIvPjx0ZXh0IHg9IjE2IiB5PSIyMyIgZm9udC1zaXplPSIyMCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TTwvdGV4dD48L3N2Zz4=',
    rdns: 'org.sponsorcoin.merit',
  });
  const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze({ info, provider }) }));
  window.addEventListener('eip6963:requestProvider', announce);
  announce();
})();
