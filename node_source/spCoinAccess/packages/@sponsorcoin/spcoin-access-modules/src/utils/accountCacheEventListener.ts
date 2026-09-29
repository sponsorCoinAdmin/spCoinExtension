// @ts-nocheck
/**
 * Subscribes to the contract's TransactionAdded event and invalidates
 * the read cache for all affected accounts (sponsor, recipient, agent).
 */
import { invalidateReadCacheForAccount } from './readCache';

const ACTIVE_LISTENERS_KEY = '__spCoinAccountCacheEventListeners';

function getActiveListeners(): Map<string, () => void> {
  const host = globalThis as typeof globalThis & {
    [ACTIVE_LISTENERS_KEY]?: Map<string, () => void>;
  };
  if (!host[ACTIVE_LISTENERS_KEY]) {
    host[ACTIVE_LISTENERS_KEY] = new Map<string, () => void>();
  }
  return host[ACTIVE_LISTENERS_KEY]!;
}

function normalizeAddress(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function buildListenerKey(contractAddress: string): string {
  return normalizeAddress(contractAddress);
}

export function startAccountCacheEventListener(
  contract: unknown,
  contractAddress: string,
): void {
  if (typeof window !== 'undefined') {
    stopAllAccountCacheEventListeners();
    return;
  }

  const activeListeners = getActiveListeners();
  const key = buildListenerKey(contractAddress);
  if (activeListeners.has(key)) return; // already listening

  const typedContract = contract as {
    on?: (event: string, handler: (...args: unknown[]) => void) => void;
    off?: (event: string, handler: (...args: unknown[]) => void) => void;
  };

  if (typeof typedContract?.on !== 'function') return;

  const handler = (...args: unknown[]) => {
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

export function stopAccountCacheEventListener(contractAddress: string): void {
  const activeListeners = getActiveListeners();
  const key = buildListenerKey(contractAddress);
  const cleanup = activeListeners.get(key);
  if (cleanup) {
    cleanup();
    activeListeners.delete(key);
  }
}

export function stopAllAccountCacheEventListeners(): void {
  const activeListeners = getActiveListeners();
  for (const cleanup of activeListeners.values()) cleanup();
  activeListeners.clear();
}
