// File: src/responder.ts
//
// 2026-11-06 (docs/design/meritConnectDesign.txt, row M5): the responder's half, the wallet that holds the accounts and answers. Moved from lib/spCoin/webRemoteResponder.ts and webRemoteSelection.ts (the web app) with their rules.
// The host supplies WHAT the wallet knows and does (its shared list, the accounts it can offer, how its account selector opens, how it signs); this file decides what to do with a request.
//   - one request at a time, in the order they arrived;
//   - eth_requestAccounts opens the wallet's account selector, STARTING from the accounts the requester already holds (never offering what is not on offer); the FIRST change answers the requester with the list
//     as it is (even when empty), every later change is PUSHED, closing the selector ends the selection (a close with no change at all answers 4001);
//   - the shared list is the responder's own: the requester may only ask for it, or revoke it (which only ever reduces it);
//   - signing methods need an account that is in the shared list (else 4100) and the person's approval in this wallet (the host's `sign`).
import { ERROR, MAX_SHARED, MeritConnectError, PROTOCOL_VERSION, fail, isAddress, ok, parseRequest, } from './protocol.js';
import { createTrace } from './trace.js';
const sameAddress = (a, b) => a.toLowerCase() === b.toLowerCase();
export function createResponder(deps) {
    const trace = createTrace(deps.trace);
    const { handlers } = deps;
    let chain = Promise.resolve();
    const isShared = (address) => typeof address === 'string' && handlers.shared().some((a) => sameAddress(a, address));
    async function selectAccounts(request) {
        const rid = request.rid;
        const offered = await handlers.offered();
        if (!offered.length)
            throw new MeritConnectError(ERROR.UNAVAILABLE, 'This wallet has no accounts to share. Add or unlock an account first.');
        trace('selection.request', { rid, offered: offered.length });
        const held = Array.isArray(request.params) ? request.params[0]?.shared : undefined;
        const requested = Array.isArray(held) ? held.filter(isAddress) : handlers.shared();
        const start = requested.filter((a) => offered.some((o) => sameAddress(o, a)));
        // 2026-11-06 (owner: "the first remote call is to sync the accounts connected on the calling program to the remote program"): opening the selection IS the sync. The accounts the caller holds that exist here become the shared list NOW
        // (they show as connected), and every account here that the caller does not hold stays disconnected, the default. A caller that sent no list leaves this wallet's own shared list as it is.
        if (Array.isArray(held)) {
            handlers.setShared(start);
            trace('selection.sync', { rid, held: requested.length, connected: start.length, notHere: requested.length - start.length });
        }
        return new Promise((resolve, reject) => {
            let answered = false;
            handlers
                .openSelection({
                rid,
                start,
                offered,
                onChange: (selected) => {
                    const accounts = selected.filter(isAddress).slice(0, MAX_SHARED);
                    handlers.setShared(accounts);
                    trace('selection.change', { rid, accounts: accounts.length, answered });
                    if (!answered) {
                        // the first change answers the requester, with the list as it is now (even when empty); every later change is pushed
                        answered = true;
                        resolve(accounts);
                    }
                    else {
                        deps.push({ v: PROTOCOL_VERSION, rid, kind: 'selection', accounts });
                        trace('selection.push', { rid, accounts: accounts.length });
                    }
                },
            })
                .then(() => {
                trace('selection.close', { rid, answered });
                if (answered)
                    deps.push({ v: PROTOCOL_VERSION, rid, kind: 'selection', closed: true });
                else
                    reject(new MeritConnectError(ERROR.REJECTED, 'You closed the account selector in this wallet.'));
            }, (error) => {
                trace('failed', { rid, method: request.method, reason: error instanceof Error ? error.message : String(error) });
                if (!answered)
                    reject(error);
            });
        });
    }
    async function run(request) {
        switch (request.method) {
            case 'eth_chainId':
                return `0x${handlers.chainId().toString(16)}`;
            case 'eth_accounts':
                return handlers.shared();
            // the requester disconnects: nothing is shared any more
            case 'wallet_revokePermissions':
                handlers.setShared([]);
                return null;
            // 2026-11-06 (owner: the calling app has a list of connected accounts which are set as connected on the remote): the caller's Connect / Disconnect on an account, with no screen opened here. Exactly the listed accounts that exist here are connected;
            // every other account here is disconnected. The answer is the list as it is now, so the caller keeps what really was connected.
            case 'merit_syncAccounts': {
                const body = Array.isArray(request.params) ? request.params[0] : undefined;
                if (!body || !Array.isArray(body.connected))
                    throw new MeritConnectError(ERROR.INVALID_PARAMS, 'merit_syncAccounts needs the list of accounts to connect.');
                const offered = await handlers.offered();
                const connected = body.connected.filter(isAddress).filter((a) => offered.some((o) => sameAddress(o, a))).slice(0, MAX_SHARED);
                handlers.setShared(connected);
                handlers.refreshSelection?.(connected);
                trace('sync', { rid: request.rid, asked: body.connected.length, connected: connected.length });
                return connected;
            }
            case 'eth_requestAccounts':
                return selectAccounts(request);
            // 2026-11-07 (owner: Connect has its own page, like MetaMask): connecting the wallet is a confirmation here; the accounts are chosen separately (eth_requestAccounts) and kept in step by merit_syncAccounts
            case 'merit_requestConnection':
                await handlers.confirmConnection?.({ rid: request.rid });
                return handlers.shared();
            case 'personal_sign':
            case 'eth_signTypedData_v4':
            case 'eth_sendTransaction': {
                if (!handlers.sign)
                    throw new MeritConnectError(ERROR.UNSUPPORTED, `This wallet does not answer ${request.method} yet.`);
                const params = Array.isArray(request.params) ? request.params : [];
                const account = request.method === 'personal_sign' ? params[1] : request.method === 'eth_signTypedData_v4' ? params[0] : params[0]?.from;
                if (!isShared(account))
                    throw new MeritConnectError(ERROR.UNAUTHORIZED, 'That account is not shared with the other wallet.');
                return handlers.sign({ rid: request.rid, method: request.method, params: request.params });
            }
            default:
                throw new MeritConnectError(ERROR.UNSUPPORTED, `This wallet does not answer ${request.method}.`);
        }
    }
    /** A request from the other wallet. Resolves when it has been answered (the host does not need to wait for it). */
    function handle(data) {
        const parsed = parseRequest(data);
        if (parsed.kind === 'drop') {
            trace('refused', { reason: `request ${parsed.reason}` });
            return Promise.resolve();
        }
        if (parsed.kind === 'refuse') {
            trace('refused', { reason: `request ${parsed.reason}` });
            deps.reply(parsed.reply);
            return Promise.resolve();
        }
        const request = parsed.value;
        trace('received', { rid: request.rid, method: request.method });
        // one at a time, in the order they arrived
        const done = chain.then(async () => {
            let reply;
            try {
                reply = ok(request.rid, await run(request));
                trace('answered', { rid: request.rid, method: request.method });
            }
            catch (error) {
                const code = error instanceof MeritConnectError ? error.code : error?.code === 'user_rejected' ? ERROR.REJECTED : ERROR.UNAVAILABLE;
                const message = error instanceof Error ? error.message : 'The wallet could not answer.';
                trace('failed', { rid: request.rid, method: request.method, code, message });
                reply = fail(request.rid, code, message);
            }
            deps.reply(reply);
        });
        chain = done;
        return done;
    }
    return { handle };
}
