// File: src/client.ts
//
// 2026-11-06 (docs/design/meritConnectDesign.txt, rows M6 and section 7): the standard calls a wallet makes to ask another Merit wallet who is connected, for its accounts, and to disconnect. They run over ONE function the
// host supplies (`request`: in the Chrome extension a message to the worker's relay), so the calls are the same in every app. The side asked is 'EXT' or 'WEB_APP'.
//
// The copy of the other wallet's shared list that this wallet keeps is for DISPLAY. The other wallet is the authority (design section 6), so the copy is corrected by a PULL (handshake), never by an unasked push.
import { ERROR, MeritConnectError, isAddress } from './protocol.js';
import { createTrace } from './trace.js';
/** How long a list that loads while the link still reads "not connected" waits for the link before it shows what it has. */
export const LINK_WAIT_MS = 1500;
/** How long the handshake waits for the other wallet's answer. */
export const HANDSHAKE_MS = 2500;
/** A handshake asked this recently is not asked again (the list loads often). */
export const HANDSHAKE_MIN_GAP_MS = 1500;
const sameList = (a, b) => a.length === b.length && a.every((x) => b.some((y) => y.toLowerCase() === x.toLowerCase()));
const has = (list, address) => list.some((a) => a.toLowerCase() === address.toLowerCase());
const without = (list, remove) => list.filter((a) => !has(remove, a));
const union = (a, b) => [...a, ...b.filter((x) => !has(a, x))];
function createSideClient(side, config) {
    const trace = createTrace(config.trace);
    let lastHandshakeAt = Number.NEGATIVE_INFINITY;
    // 2026-11-06 (owner): this wallet's connected accounts are kept (persisted) while the link is down, and the remote disconnects ALL of its accounts then. So the FIRST handshake after a start, a disconnect or a lost link does not pull: it
    // RE-SENDS this wallet's connected list (merit_syncAccounts), which re-establishes the connection states. An account the remote does not have is removed here, with a notice.
    let needsResync = true;
    // a state change made here is being sent: the list reloads it causes must not pull (the other wallet has not heard of it yet, and would bring the account back)
    let changing = 0;
    config.subscribeLink(() => {
        if (!config.link().connected)
            needsResync = true;
    });
    const appName = side === 'EXT' ? 'Merit (Extension)' : 'Merit (Web App)';
    const announce = (addresses, why) => {
        config.notify?.(why === 'missing' ? `Account Does not Exist on ${appName}\nRemoved from Local` : 'Disconnected by Remote', addresses);
    };
    /** The link may read "not connected" only because its first answer has not come back: wait for it a moment. */
    function waitForLink() {
        if (config.link().connected)
            return Promise.resolve(true);
        return new Promise((resolve) => {
            let timer;
            let off = () => undefined;
            const done = (value) => {
                off();
                config.clearTimer(timer);
                resolve(value);
            };
            off = config.subscribeLink(() => {
                if (config.link().connected)
                    done(true);
            });
            timer = config.setTimer(() => done(false), LINK_WAIT_MS);
        });
    }
    function withTimeout(promise, ms, what) {
        return new Promise((resolve, reject) => {
            const timer = config.setTimer(() => reject(new Error(`${what} timed out`)), ms);
            promise.then((value) => {
                config.clearTimer(timer);
                resolve(value);
            }, (error) => {
                config.clearTimer(timer);
                reject(error);
            });
        });
    }
    const readDisconnected = async () => (config.getDisconnected ? [...(await config.getDisconnected())] : []);
    const writeDisconnected = async (accounts) => {
        if (config.setDisconnected)
            await config.setDisconnected(accounts);
    };
    /** Tell the other wallet which accounts are connected (merit_syncAccounts). Resolves with the list it really holds connected now. */
    async function syncRemote(connected, why) {
        const rid = config.newRid();
        trace('request', { side, rid, method: 'merit_syncAccounts', asked: connected.length, why });
        const reply = await config.request('merit_syncAccounts', [{ connected }], rid);
        if (!reply.ok)
            throw new MeritConnectError(reply.error.code, reply.error.message, reply.error.data);
        return (Array.isArray(reply.result) ? reply.result : []).filter(isAddress);
    }
    /**
     * Make the two lists one. The other wallet owns the accounts, so what it has connected decides the connected accounts here:
     *   - connected here but no longer connected there: the other wallet DISCONNECTED it, so it is REMOVED from this list;
     *   - connected there but not known here: the other wallet connected it, so it is ADDED as connected;
     *   - disconnected HERE (kept in the list) but still connected there: this wallet changed its state, so this wallet's choice wins and the other wallet is told.
     */
    async function handshake(options) {
        const stored = [...(await config.getShared())];
        const kept = await readDisconnected();
        const listed = () => (config.getDisconnected ? { disconnected: kept } : {});
        const unchanged = (skipped) => ({ changed: false, shared: stored, ...listed(), skipped });
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
                if (!missing.length)
                    return { changed: false, shared: stored, ...listed() };
                const next = without(stored, missing);
                await writeDisconnected(without(kept, missing));
                await config.setShared(next);
                announce(missing, 'missing');
                return { changed: true, shared: next, ...listed() };
            }
            needsResync = false;
            const reply = await withTimeout(config.request('eth_accounts', undefined, rid), HANDSHAKE_MS, 'handshake');
            if (!reply.ok)
                throw new MeritConnectError(reply.error.code, reply.error.message);
            const remote = (Array.isArray(reply.result) ? reply.result : []).filter(isAddress);
            const removed = stored.filter((a) => !has(remote, a));
            const added = remote.filter((a) => !has(stored, a) && !has(kept, a));
            const mine = remote.filter((a) => has(kept, a));
            const next = union(without(stored, removed), added);
            const changed = !sameList(next, stored);
            trace('handshake', { side, rid, stored: stored.length, shared: next.length, removed: removed.length, added: added.length, mineWins: mine.length, changed });
            if (changed)
                await config.setShared(next);
            if (removed.length)
                announce(removed, 'disconnected');
            if (mine.length) {
                try {
                    await syncRemote(next, 'a disconnect made here');
                }
                catch (error) {
                    trace('handshake', { side, rid, failed: error instanceof Error ? error.message : String(error), when: 'telling the other wallet about a disconnect' });
                }
            }
            return { changed, shared: next, ...listed() };
        }
        catch (error) {
            // a failed or timed-out handshake KEEPS the stored copy
            trace('handshake', { side, rid, failed: error instanceof Error ? error.message : String(error), kept: stored.length });
            return unchanged('failed');
        }
    }
    async function fetchMeritConnections(options) {
        const link = config.link();
        const shared = options?.refresh === false || !link.connected ? [...(await config.getShared())] : (await handshake()).shared;
        return { side, connected: link.connected, loggedOn: link.loggedOn, detached: link.detached, shared };
    }
    /** The accounts of the other wallet as this wallet lists them: the connected ones, then the ones kept but disconnected. */
    async function listAccounts() {
        const connected = [...(await config.getShared())];
        const kept = without(await readDisconnected(), connected);
        return [...connected.map((address) => ({ address, connected: true })), ...kept.map((address) => ({ address, connected: false }))];
    }
    /** Open the other wallet's account selector; resolves with the accounts it answers (the first change), which are kept. Later changes arrive as pushes through the relay. */
    async function requestAccounts() {
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
    /**
     * Change one account's state from THIS wallet. Connect: the other wallet is told (it must be reachable) and answers with what really is connected. Disconnect: the account STAYS in this list as disconnected; the other wallet is told when it can
     * be (when it cannot, the next handshake tells it: this wallet's choice wins).
     */
    async function setAccountConnected(address, connected) {
        changing++;
        try {
            await changeAccount(address, connected);
        }
        finally {
            changing--;
        }
    }
    async function changeAccount(address, connected) {
        if (!isAddress(address))
            throw new MeritConnectError(ERROR.INVALID_PARAMS, 'That is not an account address.');
        const current = [...(await config.getShared())];
        const kept = await readDisconnected();
        if (connected) {
            if (!(await waitForLink()))
                throw new MeritConnectError(ERROR.UNAVAILABLE, 'The other wallet is not connected, so the account cannot be connected there.');
            const now = await syncRemote(union(current, [address]), 'connect ' + address.slice(0, 8));
            if (!has(now, address))
                throw new MeritConnectError(ERROR.UNAUTHORIZED, 'That account is not on the other wallet.');
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
        }
        catch (error) {
            trace('request', { side, method: 'merit_syncAccounts', failed: error instanceof Error ? error.message : String(error), disconnect: address.slice(0, 8) });
        }
    }
    /**
     * Disconnect from the other wallet (2026-11-06, owner): this wallet's accounts KEEP their connected state (persisted, so the connection can be re-established); the OTHER wallet disconnects all of its accounts. When the link is made again
     * the first handshake re-sends the connected list.
     */
    async function revoke() {
        needsResync = true;
        const rid = config.newRid();
        try {
            const reply = await config.request('wallet_revokePermissions', undefined, rid);
            trace('revoke', { side, rid, ok: reply.ok, ...(reply.ok ? {} : { code: reply.error.code }) });
        }
        catch (error) {
            trace('revoke', { side, rid, failed: error instanceof Error ? error.message : String(error) });
        }
    }
    return { handshake, fetchMeritConnections, requestAccounts, revoke, setAccountConnected, listAccounts };
}
/** The standard calls, for the sides this host can reach. A side that was not configured throws 4900. */
export function createMeritConnect(sides) {
    const clients = new Map();
    const client = (side) => {
        const config = sides[side];
        if (!config)
            throw new MeritConnectError(ERROR.UNAVAILABLE, `This host has no connection to ${side}.`);
        let made = clients.get(side);
        if (!made) {
            made = createSideClient(side, config);
            clients.set(side, made);
        }
        return made;
    };
    return {
        fetchMeritConnections: async (side, options) => client(side).fetchMeritConnections(options),
        requestAccounts: async (side) => client(side).requestAccounts(),
        handshake: async (side, options) => client(side).handshake(options),
        revoke: async (side) => client(side).revoke(),
        /** Connect or disconnect ONE account from this wallet (a disconnected account stays in the list). */
        setAccountConnected: async (side, address, connected) => client(side).setAccountConnected(address, connected),
        /** The accounts as this wallet lists them, each connected or disconnected. */
        listAccounts: async (side) => client(side).listAccounts(),
        /** The link to that side came up or went down: the host re-runs its list load (which runs the handshake). */
        onConnectionChange: (side, listener) => {
            const config = sides[side];
            if (!config)
                throw new MeritConnectError(ERROR.UNAVAILABLE, `This host has no connection to ${side}.`);
            return config.subscribeLink(listener);
        },
    };
}
