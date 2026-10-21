// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/sync/pushContextPatch.ts
//
// docs/meritMigration.txt row 32. The one best-effort push of a changed ExchangeContext field to the sync server, written once. Four places each carried their own copy of these lines (the web's walletState for an account or network switch, and the three
// useCrossProcess hooks for active tokens, show-test-nets and package access managers): get a sync token, push the patch under the account's key, treat any failure as non-fatal (the local change has already been made and must keep working whether or not the
// sync server is reachable: wallet locked, signature rejected, network down), and ALWAYS clear the settled Merit approval afterwards. That last step matters: getting a token goes through the same write-approval gate every transaction uses, which normally clears
// when the message panel reports an outcome; a silent background push never opens it, so without the clear the wallet title stays on "Signing Authorize Sync" for up to a minute (found live 2026-09-04 and 2026-09-07).
import type { EnsureSyncTokenParams } from './syncToken';

export interface PushPlan {
  chainId: number;
  /** The account address as the wallet shows it. */
  address: string;
  /** The lower-case address the server keys the record by. */
  key: string;
  rpcUrl: string;
}

export interface PushHost {
  ensureSyncToken(params: EnsureSyncTokenParams): Promise<string>;
  pushExchangeContextPatch(key: string, patch: unknown, token: string, source: string): Promise<{ revision: number }>;
  clearSettledMeritApproval(): void;
}

export interface PushHooks {
  /** The server took the patch and gave it this revision (a host records it so it can ignore the echo of its own write). */
  onPushed?(key: string, revision: number): void;
  /** The push failed for any reason. Nothing is thrown; this is the place to log. */
  onFailed?(error: unknown): void;
}

/** Never rejects. Resolves when the push has finished (or failed) and the settled approval has been cleared. */
export async function pushContextPatch(host: PushHost, plan: PushPlan, patch: unknown, hooks: PushHooks = {}, source = 'MeritExchangeContext'): Promise<void> {
  try {
    const token = await host.ensureSyncToken({ chainId: plan.chainId, activeAccountAddress: plan.address, rpcUrl: plan.rpcUrl });
    const result = await host.pushExchangeContextPatch(plan.key, patch, token, source);
    hooks.onPushed?.(plan.key, result.revision);
  } catch (error) {
    try {
      hooks.onFailed?.(error);
    } catch {
      // a logging hook must not break the push's own guarantee
    }
  } finally {
    host.clearSettledMeritApproval();
  }
}
