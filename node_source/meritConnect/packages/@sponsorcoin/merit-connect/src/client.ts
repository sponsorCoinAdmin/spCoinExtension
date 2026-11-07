// File: src/client.ts
//
// 2026-11-06 (docs/design/meritConnectDesign.txt, rows M6 and section 7): the standard calls a wallet makes to ask another Merit wallet who is connected, for its accounts, and to disconnect. They run over ONE function the
// host supplies (`request`: in the Chrome extension a message to the worker's relay), so the calls are the same in every app. The side asked is 'EXT' or 'WEB_APP'.
//
// The copy of the other wallet's shared list that this wallet keeps is for DISPLAY. The other wallet is the authority (design section 6), so the copy is corrected by a PULL (handshake), never by an unasked push.
import { ERROR, MeritConnectError, isAddress, type Reply, type Side } from './protocol.js';
import { createTrace, type TraceFn } from './trace.js';

/** How a host asks the other wallet: the relay's `request`, reached however the host reaches it. Always resolves with a reply. */
export type RequestFn = (method: string, params: unknown, rid: string) => Promise<Reply>;

export interface LinkState {
  /** The other wallet answers and the person has not disconnected it. */
  connected: boolean;
  loggedOn: boolean;
  detached: boolean;
}

export interface SideConfig {
  request: RequestFn;
  /** The link as it reads now. It reads "not connected" until its first answer comes back. */
  link(): LinkState;
  /** Called when the link comes up or goes down. Returns the unsubscribe function. */
  subscribeLink(listener: () => void): () => void;
  /** The copy of the other wallet's shared accounts that this wallet keeps. */
  getShared(): Promise<string[]> | string[];
  setShared(accounts: string[]): Promise<void> | void;
  /**
   * 2026-11-06 (owner rule): the accounts of the other wallet that this wallet KEEPS in its list but has disconnected. When the caller changes an account's state the account stays listed and only its state changes; only the OTHER wallet
   * (by disconnecting it there) removes an account from this list. A host that does not keep such a list leaves these out: a disconnect then removes the account, as before.
   */
  getDisconnected?(): Promise<string[]> | string[];
  setDisconnected?(accounts: string[]): Promise<void> | void;
  newRid(): string;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  now(): number;
  trace?: TraceFn;
  /** 2026-11-06 (owner): a message for the person when the OTHER wallet took accounts out of this list ("Disconnected by Remote", "Account Does not Exist on ..., Removed from Local"). The host shows it as a notice. */
  notify?(message: string, addresses: string[]): void;
}

export interface Connections {
  side: Side;
  connected: boolean;
  loggedOn: boolean;
  detached: boolean;
  shared: string[];
}

export interface HandshakeResult {
  /** The copy was different and was replaced. */
  changed: boolean;
  /** The accounts connected here and there after the handshake. */
  shared: string[];
  /** Accounts kept in the list but disconnected here (empty when the host keeps no such list). */
  disconnected?: string[];
  /** Why no answer was asked for (the stored copy was kept). */
  skipped?: string;
}

/** How long a list that loads while the link still reads "not connected" waits for the link before it shows what it has. */
export const LINK_WAIT_MS = 1500;
/** How long the handshake waits for the other wallet's answer. */
export const HANDSHAKE_MS = 2500;
/** A handshake asked this recently is not asked again (the list loads often). */
export const HANDSHAKE_MIN_GAP_MS = 1500;

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.some((y) => y.toLowerCase() === x.toLowerCase()));
const has = (list: string[], address: string) => list.some((a) => a.toLowerCase() === address.toLowerCase());
const without = (list: string[], remove: string[]) => list.filter((a) => !has(remove, a));
const union = (a: string[], b: string[]) => [...a, ...b.filter((x) => !has(a, x))];

/** One account of the other wallet as this wallet lists it: connected or disconnected (kept, not removed). */
export interface ListedAccount {
  address: string;
  connected: boolean;
}

function createSideClient(side: Side, config: SideConfig) {
  const trace = createTrace(config.trace);
  let lastHandshakeAt = Number.NEGATIVE_INFINITY;
  // 2026-11-06 (owner): this wallet's connected accounts are kept (persisted) while the link is down, and the remote disconnects ALL of its accounts then. So the FIRST handshake after a start, a disconnect or a lost link does not pull: it
  // RE-SENDS this wallet's connected list (merit_syncAccounts), which re-establishes the connection states. An account the remote does not have is removed here, with a notice.
  let needsResync = true;
  // a state change made here is being sent: the list reloads it causes must not pull (the other wallet has not heard of it yet, and would bring the account back)
  let changing = 0;
  config.subscribeLink(() => {
    if (!config.link().connected) needsResync = true;
  });
  const appName = side === 'EXT' ? 'Merit (Extension)' : 'Merit (Web App)';
  const announce = (addresses: string[], why: 'missing' | 'disconnected') => {
    config.notify?.(why === 'missing' ? `Account Does not Exist on ${appName}\nRemoved from Local` : 'Disconnected by Remote', addresses);
  };

  /** The link may read "not connected" only because its first answer has not come back: wait for it a moment. */
  function waitForLink(): Promise<boolean> {
    if (config.link().connected) return Promise.resolve(true);
    return new Promise((resolve) => {
      let timer: unknown;
      let off: () => void = () => undefined;
      const done = (value: boolean) => {
        off();
        config.clearTimer(timer);
        resolve(value);
      };
      off = config.subscribeLink(() => {
        if (config.link().connected) done(true);
      });
      timer = config.setTimer(() => done(false), LINK_WAIT_MS);
    });
  }

  function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = config.setTimer(() => reject(new Error(`${what} timed out`)), ms);
      promise.then(
        (value) => {
          config.clearTimer(timer);
          resolve(value);
        },
        (error: unknown) => {
          config.clearTimer(timer);
          reject(error);
        },
      );
    });
  }

  const readDisconnected = async (): Promise<string[]> => (config.getDisconnected ? [...(await config.getDisconnected())] : []);
  const writeDisconnected = async (accounts: string[]): Promise<void> => {
    if (config.setDisconnected) await config.setDisconnected(accounts);
  };

  /** Tell the other wallet which accounts are connected (merit_syncAccounts). Resolves with the list it really holds connected now. */
  async function syncRemote(connected: string[], why: string): Promise<string[]> {
    const rid = config.newRid();
    trace('request', { side, rid, method: 'merit_syncAccounts', asked: connected.length, why });
    const reply = await config.request('merit_syncAccounts', [{ connected }], rid);
    if (!reply.ok) throw new MeritConnectError(reply.error.code, reply.error.message, reply.error.data);
    return (Array.isArray(reply.result) ? reply.result : []).filter(isAddress);
  }

  /**
   * Make the two lists one. The other wallet owns the accounts, so what it has connected decides the connected accounts here:
   *   - connected here but no longer connected there: the other wallet DISCONNECTED it, so it is REMOVED from this list;
   *   - connected there but not known here: the other wallet connected it, so it is ADDED as connected;
   *   - disconnected HERE (kept in the list) but still connected there: this wallet changed its state, so this wallet's choice wins and the other wallet is told.
   */
  async function handshake(options?: { force?: boolean }): Promise<HandshakeResult> {
    const stored = [...(await config.getShared())];
    const kept = await readDisconnected();
    const listed = (): Pick<HandshakeResult, 'disconnected'> => (config.getDisconnected ? { disconnected: kept } : {});
    const unchanged = (skipped: string): HandshakeResult => ({ changed: false, shared: stored, ...listed(), skipped });
    if (changing) {
      trace('handshake', { side, skipped: 'a change is being sent', stored: stored.length });
      return unchanged('a change is being sent');
    }
    if (!(await waitForLink())) {
      trace('handshake', { side, skipped: 'other wallet not connected', stored: stored.length });
      return unchanged('other wallet not connected');
    }
    if (!options?.force && config.now() - lastHandshakeAt < HANDSHAKE_MIN_GAP_MS) {
      trace('handshake', { side, skipped: 'asked a moment ago', stored: stored.length });
      return unchanged('asked a moment ago');
    }
    lastHandshakeAt = config.now();
    const rid = config.newRid();
    try {
      if (needsResync && stored.length) {
        const there = await withTimeout(syncRemote(stored, 'reconnect'), HANDSHAKE_MS, 'handshake');
        needsResync = false;
        const missing = stored.filter((a) => !has(there, a));
        trace('handshake', { side, rid, resync: true, sent: stored.length, connected: stored.length - missing.length, missing: missing.length });
        if (!missing.length) return { changed: false, shared: stored, ...listed() };
        const next = without(stored, missing);
        await writeDisconnected(without(kept, missing));
        await config.setShared(next);
        announce(missing, 'missing');
        return { changed: true, shared: next, ...listed() };
      }
      needsResync = false;
      const reply = await withTimeout(config.request('eth_accounts', undefined, rid), HANDSHAKE_MS, 'handshake');
      if (!reply.ok) throw new MeritConnectError(reply.error.code, reply.error.message);
      const remote = (Array.isArray(reply.result) ? reply.result : []).filter(isAddress);
      const removed = stored.filter((a) => !has(remote, a));
      const added = remote.filter((a) => !has(stored, a) && !has(kept, a));
      const mine = remote.filter((a) => has(kept, a));
      const next = union(without(stored, removed), added);
      const changed = !sameList(next, stored);
      trace('handshake', { side, rid, stored: stored.length, shared: next.length, removed: removed.length, added: added.length, mineWins: mine.length, changed });
      if (changed) await config.setShared(next);
      if (removed.length) announce(removed, 'disconnected');
      if (mine.length) {
        try {
          await syncRemote(next, 'a disconnect made here');
        } catch (error) {
          trace('handshake', { side, rid, failed: error instanceof Error ? error.message : String(error), when: 'telling the other wallet about a disconnect' });
        }
      }
      return { changed, shared: next, ...listed() };
    } catch (error) {
      // a failed or timed-out handshake KEEPS the stored copy
      trace('handshake', { side, rid, failed: error instanceof Error ? error.message : String(error), kept: stored.length });
      return unchanged('failed');
    }
  }

  async function fetchMeritConnections(options?: { refresh?: boolean }): Promise<Connections> {
    const link = config.link();
    const shared = options?.refresh === false || !link.connected ? [...(await config.getShared())] : (await handshake()).shared;
    return { side, connected: link.connected, loggedOn: link.loggedOn, detached: link.detached, shared };
  }

  /** The accounts of the other wallet as this wallet lists them: the connected ones, then the ones kept but disconnected. */
  async function listAccounts(): Promise<ListedAccount[]> {
    const connected = [...(await config.getShared())];
    const kept = without(await readDisconnected(), connected);
    return [...connected.map((address) => ({ address, connected: true })), ...kept.map((address) => ({ address, connected: false }))];
  }

  /** Open the other wallet's account selector; resolves with the accounts it answers (the first change), which are kept. Later changes arrive as pushes through the relay. */
  async function requestAccounts(): Promise<string[]> {
    const rid = config.newRid();
    const held = [...(await config.getShared())];
    trace('request', { side, rid, method: 'eth_requestAccounts', held: held.length });
    const reply = await config.request('eth_requestAccounts', [{ shared: held }], rid);
    if (!reply.ok) {
      trace('failed', { side, rid, method: 'eth_requestAccounts', code: reply.error.code });
      throw new MeritConnectError(reply.error.code, reply.error.message, reply.error.data);
    }
    const accounts = (Array.isArray(reply.result) ? reply.result : []).filter(isAddress);
    // an account the other wallet now has connected is no longer one this wallet holds disconnected (written first: the list reload the shared list causes reads it)
    await writeDisconnected(without(await readDisconnected(), accounts));
    await config.setShared(accounts);
    return accounts;
  }

  /** 2026-11-07 (owner: Connect has its own page, like MetaMask): connect THIS wallet to the other. The other wallet shows its own Connect page (Cancel / Connect); no account is chosen or changed here. Rejects when the person cancels there. */
  async function requestConnection(): Promise<void> {
    const rid = config.newRid();
    trace('request', { side, rid, method: 'merit_requestConnection' });
    const reply = await config.request('merit_requestConnection', [], rid);
    if (!reply.ok) {
      trace('failed', { side, rid, method: 'merit_requestConnection', code: reply.error.code });
      throw new MeritConnectError(reply.error.code, reply.error.message, reply.error.data);
    }
  }

  /**
   * Change one account's state from THIS wallet. Connect: the other wallet is told (it must be reachable) and answers with what really is connected. Disconnect: the account STAYS in this list as disconnected; the other wallet is told when it can
   * be (when it cannot, the next handshake tells it: this wallet's choice wins).
   */
  async function setAccountConnected(address: string, connected: boolean): Promise<void> {
    changing++;
    try {
      await changeAccount(address, connected);
    } finally {
      changing--;
    }
  }
  async function changeAccount(address: string, connected: boolean): Promise<void> {
    if (!isAddress(address)) throw new MeritConnectError(ERROR.INVALID_PARAMS, 'That is not an account address.');
    const current = [...(await config.getShared())];
    const kept = await readDisconnected();
    if (connected) {
      if (!(await waitForLink())) throw new MeritConnectError(ERROR.UNAVAILABLE, 'The other wallet is not connected, so the account cannot be connected there.');
      const now = await syncRemote(union(current, [address]), 'connect ' + address.slice(0, 8));
      if (!has(now, address)) throw new MeritConnectError(ERROR.UNAUTHORIZED, 'That account is not on the other wallet.');
      await writeDisconnected(without(kept, now));
      await config.setShared(now);
      return;
    }
    const next = without(current, [address]);
    await writeDisconnected(config.setDisconnected ? union(kept, [address]) : kept);
    await config.setShared(next);
    if (!config.link().connected) {
      trace('request', { side, method: 'merit_syncAccounts', skipped: 'other wallet not connected: the next handshake tells it', disconnect: address.slice(0, 8) });
      return;
    }
    try {
      await syncRemote(next, 'disconnect ' + address.slice(0, 8));
    } catch (error) {
      trace('request', { side, method: 'merit_syncAccounts', failed: error instanceof Error ? error.message : String(error), disconnect: address.slice(0, 8) });
    }
  }

  /**
   * Disconnect from the other wallet (2026-11-06, owner): this wallet's accounts KEEP their connected state (persisted, so the connection can be re-established); the OTHER wallet disconnects all of its accounts. When the link is made again
   * the first handshake re-sends the connected list.
   */
  async function revoke(): Promise<void> {
    needsResync = true;
    const rid = config.newRid();
    try {
      const reply = await config.request('wallet_revokePermissions', undefined, rid);
      trace('revoke', { side, rid, ok: reply.ok, ...(reply.ok ? {} : { code: reply.error.code }) });
    } catch (error) {
      trace('revoke', { side, rid, failed: error instanceof Error ? error.message : String(error) });
    }
  }

  return { handshake, fetchMeritConnections, requestAccounts, requestConnection, revoke, setAccountConnected, listAccounts };
}

/** The standard calls, for the sides this host can reach. A side that was not configured throws 4900. */
export function createMeritConnect(sides: Partial<Record<Side, SideConfig>>) {
  const clients = new Map<Side, ReturnType<typeof createSideClient>>();
  const client = (side: Side) => {
    const config = sides[side];
    if (!config) throw new MeritConnectError(ERROR.UNAVAILABLE, `This host has no connection to ${side}.`);
    let made = clients.get(side);
    if (!made) {
      made = createSideClient(side, config);
      clients.set(side, made);
    }
    return made;
  };
  return {
    fetchMeritConnections: async (side: Side, options?: { refresh?: boolean }) => client(side).fetchMeritConnections(options),
    requestAccounts: async (side: Side) => client(side).requestAccounts(),
    /** Connect this wallet to the other: its own Connect page (Cancel / Connect), no accounts. */
    requestConnection: async (side: Side) => client(side).requestConnection(),
    handshake: async (side: Side, options?: { force?: boolean }) => client(side).handshake(options),
    revoke: async (side: Side) => client(side).revoke(),
    /** Connect or disconnect ONE account from this wallet (a disconnected account stays in the list). */
    setAccountConnected: async (side: Side, address: string, connected: boolean) => client(side).setAccountConnected(address, connected),
    /** The accounts as this wallet lists them, each connected or disconnected. */
    listAccounts: async (side: Side) => client(side).listAccounts(),
    /** The link to that side came up or went down: the host re-runs its list load (which runs the handshake). */
    onConnectionChange: (side: Side, listener: () => void) => {
      const config = sides[side];
      if (!config) throw new MeritConnectError(ERROR.UNAVAILABLE, `This host has no connection to ${side}.`);
      return config.subscribeLink(listener);
    },
  };
}

export type MeritConnect = ReturnType<typeof createMeritConnect>;
