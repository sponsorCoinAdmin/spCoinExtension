// @ts-nocheck
/**
 * Subscribes to the contract's TransactionAdded event and invalidates
 * the read cache for all affected accounts (sponsor, recipient, agent).
 */
import { invalidateReadCacheForAccount } from './readCache';
const ACTIVE_LISTENERS_KEY = '__spCoinAccountCacheEventListeners';
function getActiveListeners() {
    const host = globalThis;
    if (!host[ACTIVE_LISTENERS_KEY]) {
        host[ACTIVE_LISTENERS_KEY] = new Map();
    }
    return host[ACTIVE_LISTENERS_KEY];
}
function normalizeAddress(value) {
    return String(value || '').trim().toLowerCase();
}
function buildListenerKey(contractAddress) {
    return normalizeAddress(contractAddress);
}
export function startAccountCacheEventListener(contract, contractAddress) {
    if (typeof window !== 'undefined') {
        stopAllAccountCacheEventListeners();
        return;
    }
    const activeListeners = getActiveListeners();
    const key = buildListenerKey(contractAddress);
    if (activeListeners.has(key))
        return; // already listening
    const typedContract = contract;
    if (typeof typedContract?.on !== 'function')
        return;
    const handler = (...args) => {
        // TransactionAdded(transactionId, sponsorKey, recipientKey, agentKey, ...)
        const sponsorKey = normalizeAddress(args[1]);
        const recipientKey = normalizeAddress(args[2]);
        const agentKey = normalizeAddress(args[3]);
        if (sponsorKey) {
            invalidateReadCacheForAccount(sponsorKey);
        }
        if (recipientKey) {
            invalidateReadCacheForAccount(recipientKey);
        }
        if (agentKey && agentKey !== '0x0000000000000000000000000000000000000000') {
            invalidateReadCacheForAccount(agentKey);
        }
    };
    typedContract.on('TransactionAdded', handler);
    activeListeners.set(key, () => {
        typedContract.off?.('TransactionAdded', handler);
    });
}
export function stopAccountCacheEventListener(contractAddress) {
    const activeListeners = getActiveListeners();
    const key = buildListenerKey(contractAddress);
    const cleanup = activeListeners.get(key);
    if (cleanup) {
        cleanup();
        activeListeners.delete(key);
    }
}
export function stopAllAccountCacheEventListeners() {
    const activeListeners = getActiveListeners();
    for (const cleanup of activeListeners.values())
        cleanup();
    activeListeners.clear();
}
