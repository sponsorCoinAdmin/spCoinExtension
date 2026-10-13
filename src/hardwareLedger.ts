// File: src/hardwareLedger.ts
//
// 2026-10-13 (docs/connectionDesign.txt item 12): a LEDGER as an approver for the extension, over WebHID, with the package's shared hardware layer (the same transport and authenticator the web app uses). The Ledger library is loaded only when a person connects a device. This host supplies
// the chain RPC (the wallet's one network registry) that prices a transaction before the device signs it and broadcasts what it signed. The device shows every request on its own screen. A Trezor is NOT offered here yet: Trezor Connect needs a different build inside an extension.
// STATUS: tested with a simulated device; NOT yet run on a real Ledger, and not yet confirmed that WebHID shows its device chooser from the side panel (a person with a Ledger must try it).
import {
  createHardwareAuthenticator,
  createLedgerTransport,
  type LedgerEthApp,
  type LedgerHidDevice,
  type LedgerHidTransportClass,
} from '@sponsorcoin/merit-wallet';
import { rpcUrlForChain } from './chainRpc';
import { Buffer } from 'buffer';

// The Ledger libraries were written for Node and use Buffer; a browser page has none (the web app's bundler supplies one, this extension's does not), so it is provided here before they are loaded.
(globalThis as { Buffer?: typeof Buffer }).Buffer ??= Buffer;

export const LEDGER_ID = 'hardware:ledger' as const;

/** One JSON-RPC call to the chain: nonce, gas and fees before the device signs, and the broadcast of what it signed. */
export async function chainRpc(chainId: number, method: string, params: unknown[]): Promise<unknown> {
  const url = rpcUrlForChain(chainId);
  if (!url) throw new Error(`No RPC is configured for chain ${chainId}.`);
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message || `${method} failed.`);
  return body.result;
}

export const ledgerTransport = createLedgerTransport({
  loadTransport: () => import('@ledgerhq/hw-transport-webhid') as unknown as Promise<{ default: LedgerHidTransportClass }>,
  loadEthApp: () => import('@ledgerhq/hw-app-eth') as unknown as Promise<{ default: new (device: LedgerHidDevice) => LedgerEthApp }>,
  rpc: chainRpc,
});

export const ledgerAuthenticator = createHardwareAuthenticator(ledgerTransport, {
  broadcast: async (rawTransaction, chainId) => String(await chainRpc(chainId, 'eth_sendRawTransaction', [rawTransaction])),
});

/** After a panel reload: reopen a Ledger the person granted earlier, with no prompt (it just lists its accounts again when it is plugged in). */
export function restoreLedger(): void {
  void ledgerTransport.restore().catch(() => undefined);
}
