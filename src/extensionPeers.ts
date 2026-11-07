// File: src/extensionPeers.ts
//
// 2026-11-01 (owner: the peer connections are injected, the hook lives in the merit package): the extension's PEERS, as the merit package's PeerConnection (src/peer/peerConnection.ts). Only the TRANSPORT lives here.
// Merit (Web App): connected = a Merit web app page is open and answers. Asked through the worker (merit/web/status): the worker asks the pages (merit_queryWalletState) and replies after they answered or timed out; the worker also says
// when its set of pages changed (merit/web/changed). Whether that page's own wallet is logged on comes back too (`loggedOn`) for screens that want it.
//
// 2026-11-06 (docs/design/meritConnectDesign.txt, row M13; owner: "a connection hook in the library which can be subscribed to"): the status round trip is made by the library's CONNECTION MONITOR, which says not only whether the web app is connected but WHY
// it is not (no page open, a page open but silent, or disconnected by the person). The peer below asks THROUGH the monitor, so there is one probe and one answer; screens read the monitor (`meritWebConnection`) for the reason.
import { createPeerConnection, type PeerConnection } from '@sponsorcoin/merit-wallet';
import { createConnectionMonitor } from '@sponsorcoin/merit-connect';
import { engineTrace } from '@sponsorcoin/spcoin-exchange-engine';

type StatusReply = { ok?: boolean; reachable?: boolean; reporting?: number; candidates?: number; loggedOn?: boolean };

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
    const status = await meritWebConnection.refresh();
    return status.state === 'unknown' ? undefined : status.reporting > 0;
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
/** The link to the Merit web app, with its reason: subscribe to it, or read getSnapshot() (it works with useSyncExternalStore). */
// (created AFTER the peer: it reads the peer's own disconnect choice, and the peer's ask below reads the monitor only once the peer has started)
export const meritWebConnection = createConnectionMonitor({
  label: 'Merit web app',
  probe: async () => {
    const reply = (await chrome.runtime.sendMessage({ type: 'merit/web/status' })) as StatusReply | undefined;
    if (!reply?.ok) return undefined;
    // a worker that does not know `reporting` yet (an older build) still says whether a page answers
    return { reporting: reply.reporting ?? (reply.reachable ? 1 : 0), candidates: reply.candidates ?? 0, loggedOn: reply.loggedOn === true };
  },
  isDetached: () => meritWebApp.isDetached(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  now: () => Date.now(),
  trace: (event, detail) => engineTrace(event, detail),
});

// the person's own choice (disconnect / connect) changes the state without a new probe
meritWebApp.subscribe(() => meritWebConnection.recompute());

/** The peers the extension injects into MeritWallet, by authenticator id ('serverKeystore' is the Merit web app's wallet). */
export const extensionPeers: Record<string, PeerConnection> = { serverKeystore: meritWebApp };
