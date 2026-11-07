// File: src/protocol.ts
//
// 2026-11-06 (docs/design/meritConnectDesign.txt, sections 5 and 6): the messages two Merit wallets exchange, their version, the one table of error codes,
// and the parsing that decides what a received object is. Plain data and pure functions: no transport, no timers, no storage.
/** The protocol version this build speaks. A message with another version is answered 4901 (requests) or dropped and traced (replies, pushes). */
export const PROTOCOL_VERSION = 1;
export const SUPPORTED_VERSIONS = [1];
/** One table of error codes, the same everywhere (MetaMask's codes where they mean the same). */
export const ERROR = {
    /** The person rejected or closed the request. */
    REJECTED: 4001,
    /** Not authorised: the account is not shared, or the sender is not the page the request went to. */
    UNAUTHORIZED: 4100,
    /** The method is not one this protocol carries. */
    UNSUPPORTED: 4200,
    /** The other wallet is unreachable, closed, or did not answer in time. */
    UNAVAILABLE: 4900,
    /** The protocol version is not supported; the error's `data` lists the versions the answerer speaks. */
    VERSION: 4901,
    INVALID_PARAMS: -32602,
    /** Too many requests are waiting on the other wallet. */
    TOO_MANY: -32005,
};
/** Answered from what the responder already knows: nobody is asked (time limit READ_TIMEOUT_MS). wallet_revokePermissions only ever REDUCES what is shared, so it needs no person either. */
// merit_syncAccounts (2026-11-06) sets which of the remote accounts are connected, from the caller's list, without opening the remote's screen: the caller's own Connect / Disconnect on an account is the consent, and every signature still
// needs the person's approval on the remote.
export const READ_METHODS = ['eth_chainId', 'eth_accounts', 'wallet_revokePermissions', 'merit_syncAccounts'];
/** The person approves in the wallet that holds the key (time limit APPROVAL_TIMEOUT_MS). */
export const APPROVAL_METHODS = ['eth_requestAccounts', 'personal_sign', 'eth_signTypedData_v4', 'eth_sendTransaction'];
export const METHODS = new Set([...READ_METHODS, ...APPROVAL_METHODS]);
export const READ_TIMEOUT_MS = 20000;
export const APPROVAL_TIMEOUT_MS = 300000;
/** How long a selection stays open to pushes after the responder's first answer. */
export const SELECTION_SESSION_MS = 300000;
export const MAX_PENDING = 8;
export const MAX_SHARED = 200;
const RID = /^[\w-]{1,64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
export const isRid = (value) => typeof value === 'string' && RID.test(value);
export const isAddress = (value) => typeof value === 'string' && ADDRESS.test(value);
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
export const ok = (rid, result) => ({ v: PROTOCOL_VERSION, rid, ok: true, result });
export const fail = (rid, code, message, data) => ({
    v: PROTOCOL_VERSION,
    rid,
    ok: false,
    error: data === undefined ? { code, message } : { code, message, data },
});
/** An error with a protocol code: what a host throws to refuse, and what the client throws when the other wallet refused. */
export class MeritConnectError extends Error {
    constructor(code, message, data) {
        super(message);
        this.name = 'MeritConnectError';
        this.code = code;
        this.data = data;
    }
}
export function parseRequest(data) {
    if (!isObject(data))
        return { kind: 'drop', reason: 'not an object' };
    // without a good id there is nobody to answer
    if (!isRid(data.rid))
        return { kind: 'drop', reason: 'no valid rid' };
    const rid = data.rid;
    if (typeof data.v !== 'number' || !SUPPORTED_VERSIONS.includes(data.v)) {
        return { kind: 'refuse', reason: `version ${String(data.v)}`, reply: fail(rid, ERROR.VERSION, `Protocol version ${String(data.v)} is not supported.`, { supported: [...SUPPORTED_VERSIONS] }) };
    }
    if (typeof data.method !== 'string' || !data.method)
        return { kind: 'refuse', reason: 'no method', reply: fail(rid, ERROR.INVALID_PARAMS, 'A request needs a method.') };
    return { kind: 'ok', value: { v: data.v, rid, method: data.method, ...(data.params === undefined ? {} : { params: data.params }) } };
}
export function parseReply(data) {
    if (!isObject(data))
        return { kind: 'drop', reason: 'not an object' };
    if (!isRid(data.rid))
        return { kind: 'drop', reason: 'no valid rid' };
    if (typeof data.v !== 'number' || !SUPPORTED_VERSIONS.includes(data.v))
        return { kind: 'drop', reason: `version ${String(data.v)}` };
    if (data.ok === true)
        return { kind: 'ok', value: { v: data.v, rid: data.rid, ok: true, result: data.result ?? null } };
    const error = isObject(data.error) ? data.error : {};
    const code = typeof error.code === 'number' ? error.code : ERROR.REJECTED;
    const message = typeof error.message === 'string' ? error.message.slice(0, 300) : 'The other wallet refused the request.';
    return { kind: 'ok', value: { v: data.v, rid: data.rid, ok: false, error: { code, message } } };
}
export function parsePush(data) {
    if (!isObject(data))
        return { kind: 'drop', reason: 'not an object' };
    if (!isRid(data.rid))
        return { kind: 'drop', reason: 'no valid rid' };
    if (typeof data.v !== 'number' || !SUPPORTED_VERSIONS.includes(data.v))
        return { kind: 'drop', reason: `version ${String(data.v)}` };
    if (data.kind !== 'selection')
        return { kind: 'drop', reason: 'not a selection push' };
    if (data.closed === true)
        return { kind: 'ok', value: { v: data.v, rid: data.rid, kind: 'selection', closed: true } };
    if (!Array.isArray(data.accounts))
        return { kind: 'drop', reason: 'no accounts' };
    return { kind: 'ok', value: { v: data.v, rid: data.rid, kind: 'selection', accounts: data.accounts.filter(isAddress).slice(0, MAX_SHARED) } };
}
