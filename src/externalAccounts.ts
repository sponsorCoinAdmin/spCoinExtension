// File: src/externalAccounts.ts
//
// 2026-10-13 (docs/connectionDesign.txt items 9 and 12): the accounts the extension uses but does not hold: MetaMask's (through the relay tab) and a Ledger's (over WebHID). One place answers "does another wallet hold this account, and which one signs for it", so the send, swap and
// sign paths ask the same question whatever the wallet. An account in neither is the vault's (the extension's own default).
import type { Authenticator } from '@sponsorcoin/merit-wallet';
import { ledgerAuthenticator } from './hardwareLedger';
import { isMetaMaskAccount, metamaskAuthenticator } from './metamaskAuthenticator';

const same = (a: string, b: string) => a.toLowerCase() === b.trim().toLowerCase();

/** The wallet that holds this account, when it is not the vault: the Ledger (when connected and it gave this account) or MetaMask (when it shared it). */
export async function externalAuthenticatorFor(address: string | undefined): Promise<Authenticator | undefined> {
  if (!address) return undefined;
  const ledger = await ledgerAuthenticator.accounts().catch(() => []);
  if (ledger.some((a) => same(a.address, address))) return ledgerAuthenticator;
  if (await isMetaMaskAccount(address)) return metamaskAuthenticator;
  return undefined;
}

/** Does another wallet hold this account (so a send or a signature for it goes to that wallet, not to the vault)? */
export async function isExternalAccount(address: string | undefined): Promise<boolean> {
  return !!(await externalAuthenticatorFor(address));
}

/** Who signs for this account: its other wallet when it has one, else the vault. */
export async function authenticatorFor(address: string | undefined, vault: Authenticator): Promise<Authenticator> {
  return (await externalAuthenticatorFor(address)) ?? vault;
}
