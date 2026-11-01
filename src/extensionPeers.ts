// File: src/extensionPeers.ts
//
// 2026-11-01 (owner: the peer connections are injected, the hook lives in the merit package): the extension's PEERS, as the merit package's PeerConnection (src/peer/peerConnection.ts). Only the TRANSPORT lives here.
// Merit (Web App): connected = a Merit web app page is open and answers. Asked through the worker (merit/web/status): the worker asks the pages (merit_queryWalletState) and replies after they answered or timed out; the worker also says
// when its set of pages changed (merit/web/changed). Whether that page's own wallet is logged on comes back too (`loggedOn`) for screens that want it.
import { createPeerConnection, type PeerConnection } from '@sponsorcoin/merit-wallet';

const meritWebApp: PeerConnection = createPeerConnection('serverKeystore', {
  focus(onFocus) {
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  },
  storage: {
    get: (key) => window.localStorage.getItem(key),
    set: (key, value) => window.localStorage.setItem(key, value),
    remove: (key) => window.localStorage.removeItem(key),
  },
  // the person disconnected / connected the web app here: every web app page is told
  onChoice(detached, at) {
    void chrome.runtime.sendMessage({ type: 'merit/web/choice', detached, at }).catch(() => undefined);
  },
  async ask() {
    const reply = (await chrome.runtime.sendMessage({ type: 'merit/web/status' })) as { ok?: boolean; reachable?: boolean } | undefined;
    return reply?.ok ? !!reply.reachable : undefined;
  },
  listen({ refresh }) {
    const onMessage = (message: { type?: string; detached?: boolean; at?: number }) => {
      if (message?.type === 'merit/web/changed') refresh();
      // the person cut / made the link on the web app's side
      if (message?.type === 'merit/web/peerChoice') meritWebApp.adopt(message.detached === true, Number(message.at) || 0);
      return false;
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  },
});

/** The peers the extension injects into MeritWallet, by authenticator id ('serverKeystore' is the Merit web app's wallet). */
export const extensionPeers: Record<string, PeerConnection> = { serverKeystore: meritWebApp };
