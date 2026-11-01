// File: src/peer/peerConnection.ts
//
// 2026-11-01 (owner: the connection is full duplex; "inject these hooks as a startup parameter, to keep the load light, just like injecting the vault or keystore ... they can live in the master wrapper merit package").
// A PEER is another wallet this one is paired with (the Merit extension seen from the web app, the Merit web app seen from the extension, a phone wallet app). Wallet-level Connected means: the peer is reachable and logged on, nothing more
// (which accounts it shares is the separate, account-level connection). The truth lives in the peer, so it is ASKED, never remembered: when the wallet list first needs it, when the window regains focus (the host says how), and when the peer says it changed.
// This file is the one implementation of the state, the check and the React hook. A host injects only a TRANSPORT (how to ask, which of the peer's events to listen to) for each peer it has, as `peers` on MeritWallet, like the vault or the keystore;
// a host that injects none pays nothing: no hook runs for a peer nobody gave.
import { useEffect, useMemo, useSyncExternalStore } from 'react';

export interface PeerState {
  /** Reachable and logged on. */
  connected: boolean;
}

/** What a host supplies for one peer. */
export interface PeerTransport {
  /** Ask the peer. true / false = its answer; undefined (or a throw) = no answer, the state stays as it is. */
  ask(): Promise<boolean | undefined>;
  /** Listen to the peer's own change events: call `refresh()` to ask again, or `set()` when the event itself says the answer. Returns how to stop listening. */
  listen?(api: { refresh(): void; set(connected: boolean): void }): (() => void) | void;
  /** The host's way to hear that its window regained focus: call `onFocus` each time. Returns how to stop. Omitted: no focus checks. (The package touches no device itself: the host supplies this and `storage`.) */
  focus?(onFocus: () => void): (() => void) | void;
  /** The person disconnected (true) or connected (false) this peer: the host tells the other side, so a link is cut or made on BOTH sides (full duplex). */
  onChoice?(detached: boolean, at: number): void;
  /** Where the person's disconnect choice is kept across page loads. Omitted: the choice lasts only while the page lives. */
  storage?: { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void };
}

export interface PeerConnection {
  get(): PeerState;
  /** The person disconnected this wallet: it reads NOT connected until `attach()`, whatever the peer answers (its login does not undo a choice). The choice is kept across page loads (it is the person's intent, not a fact about the peer: facts are always asked). */
  detach(): void;
  /** The person connected this wallet again. `force`: an explicit Connect click counts as the newest choice even when the flag already reads connected (so the other side, which may have missed an earlier one, follows). */
  attach(force?: boolean): void;
  /** Did the person disconnect it? */
  isDetached(): boolean;
  /** When (ms since 1970) the link was last cut or made, on EITHER side; 0 = never. */
  choiceAt(): number;
  /** The other side choice arrived: taken when newer than ours (last writer wins), and not sent back. */
  adopt(detached: boolean, at: number): void;
  subscribe(listener: () => void): () => void;
  /** Start the checks (first use only): one question now, then on focus and on the peer's events. Idempotent. */
  start(): void;
}

const detachedKey = (id: string) => `merit-peer-detached:${id}`;
const choiceAtKey = (id: string) => `merit-peer-choice-at:${id}`;
export function createPeerConnection(id: string, transport: PeerTransport): PeerConnection {
  let answer = false; // what the peer last said: reachable and logged on
  let detached = (() => {
    try {
      return transport.storage?.get(detachedKey(id)) === '1'; // what the person chose
    } catch {
      return false;
    }
  })();
  let choiceAtMs = (() => {
    try {
      return Number(transport.storage?.get(choiceAtKey(id))) || 0;
    } catch {
      return 0;
    }
  })();
  let state: PeerState = { connected: false };
  const listeners = new Set<() => void>();
  const publish = () => {
    const connected = answer && !detached;
    if (connected === state.connected) return;
    state = { connected };
    listeners.forEach((l) => l());
  };
  const set = (connected: boolean) => {
    answer = connected;
    publish();
  };
  const keep = (next: boolean, at: number) => {
    detached = next;
    choiceAtMs = at;
    try {
      if (next) transport.storage?.set(detachedKey(id), '1');
      else transport.storage?.remove(detachedKey(id));
      transport.storage?.set(choiceAtKey(id), String(at));
    } catch {
      /* best effort */
    }
    publish();
  };
  const choose = (next: boolean, force = false) => {
    if (next === detached && !force) return;
    const at = Date.now();
    keep(next, at);
    try {
      transport.onChoice?.(next, at);
    } catch {
      /* telling the other side is best effort */
    }
  };
  let asking = false;
  const refresh = async () => {
    if (asking) return;
    asking = true;
    try {
      const reply = await transport.ask();
      if (reply !== undefined) set(reply);
    } catch {
      /* no answer: unchanged */
    } finally {
      asking = false;
    }
  };
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    void refresh();
    transport.focus?.(() => void refresh());
    transport.listen?.({ refresh: () => void refresh(), set });
  };
  return {
    get: () => state,
    detach: () => choose(true),
    attach: (force) => choose(false, force === true),
    isDetached: () => detached,
    choiceAt: () => choiceAtMs,
    adopt(next, at) {
      if (!(at > choiceAtMs)) return; // ours is newer (or the same): ours stands
      keep(next, at);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start,
  };
}

/** The states of the injected peers, by id; re-renders when any changes. Starts each peer's checks on first use. */
export function usePeerStates(peers: Record<string, PeerConnection> | undefined): Record<string, PeerState> {
  useEffect(() => {
    for (const peer of Object.values(peers ?? {})) peer.start();
  }, [peers]);
  const subscribe = (listener: () => void) => {
    const stops = Object.values(peers ?? {}).map((peer) => peer.subscribe(listener));
    return () => stops.forEach((stop) => stop());
  };
  const key = () => Object.entries(peers ?? {}).map(([id, peer]) => `${id}:${peer.get().connected ? 1 : 0}`).join('|');
  const snapshot = useSyncExternalStore(subscribe, key, key);
  return useMemo(() => Object.fromEntries(Object.entries(peers ?? {}).map(([id, peer]) => [id, peer.get()])), [snapshot, peers]);
}
