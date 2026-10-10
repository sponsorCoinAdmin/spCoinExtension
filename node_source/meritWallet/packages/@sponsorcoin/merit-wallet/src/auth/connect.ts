// File: src/auth/connect.ts
//
// 2026-10-10 (docs/connectionDesign.txt items 3 and 5) -- CONNECT and DISCONNECT, written once for every approver. "Connected" means the wallet has an active account under some approver (connectionDesign 0); to connect is to pick one account of one
// approver and make it the active account; the approver is the only thing that differs (Merit Wallet's accounts are already in the wallet, MetaMask answers with a popup, a device with its own prompt).
// The steps (2.3): ask the approver if it has to be reached -> it answers with the accounts it can sign for -> one of them is chosen -> that approver becomes the account's active authenticator -> the account becomes the active account.
// The rules this file enforces (and test/connect.test.mjs checks):
//   - nothing the host owns is touched until every check has passed: a failure leaves the current active account exactly as it was (2.6: the app never changes the active account on its own);
//   - several accounts and none chosen is not an error to hide: it throws ConnectChoiceRequired carrying the accounts, so the UI can let the user pick (the account list is the selector, Q2);
//   - the chosen account must be one the approver really answered with (no connecting an address the approver did not offer);
//   - an approver that is not registered or not reachable fails with the authenticator error (and the host's notify, i.e. the MESSAGE_PANEL, hears about it) and again changes nothing (Q3);
//   - disconnect clears the active account, and revokes the approver's permission only when it supports that, best effort: a failed revoke is reported, the account is still cleared (Q1).
import { AuthenticatorError, type Authenticator, type AuthenticatorAccount, type AuthenticatorId } from './authenticator';
import type { AuthenticatorRegistry } from './resolve';

export interface ConnectHost {
  /** Make this account the wallet's active account (the host's own state: the exchange context, the vault). */
  setActiveAccount(address: string): Promise<void> | void;
  /** Remember which approver signs for the account (connectionDesign 2.3 step 3). Optional: a host that has no per-account setting yet may omit it. */
  setActiveAuthenticator?(address: string, approverId: AuthenticatorId): Promise<void> | void;
  /** Clear the active account (disconnect). */
  clearActiveAccount(): Promise<void> | void;
  /** Tell the user (the MESSAGE_PANEL): an approver that cannot be reached, a refused permission. */
  notify?(level: 'error' | 'warning' | 'info', message: string): void;
}

/** Several accounts were offered and none was chosen: show them and let the user pick. */
export class ConnectChoiceRequired extends Error {
  readonly accounts: AuthenticatorAccount[];
  readonly approverId: string;
  constructor(approverId: string, accounts: AuthenticatorAccount[]) {
    super(`${approverId} offered ${accounts.length} accounts; choose one.`);
    this.name = 'ConnectChoiceRequired';
    this.approverId = approverId;
    this.accounts = accounts;
  }
}

export interface ConnectParams {
  registry: AuthenticatorRegistry;
  approverId: AuthenticatorId;
  /** The account to connect. Omitted: the approver's only account is used, or ConnectChoiceRequired is thrown when it has several. */
  address?: string;
  host: ConnectHost;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

async function reach(registry: AuthenticatorRegistry, approverId: AuthenticatorId, host: ConnectHost): Promise<Authenticator> {
  const authenticator = registry.get(approverId);
  if (!authenticator) {
    const error = new AuthenticatorError('unreachable', `The ${approverId} authenticator is not available in this app.`, approverId);
    host.notify?.('error', error.message);
    throw error;
  }
  const status = await authenticator.status();
  if (!status.available) {
    const error = new AuthenticatorError('unreachable', `${authenticator.label} is not reachable (not installed, locked out or unplugged).`, approverId);
    host.notify?.('error', error.message);
    throw error;
  }
  return authenticator;
}

/** Connect: choose one account of one approver and make it the active account. Resolves with what was connected. */
export async function connectAccount({ registry, approverId, address, host }: ConnectParams): Promise<{ address: string; approverId: AuthenticatorId }> {
  const authenticator = await reach(registry, approverId, host);

  let offered = await authenticator.accounts();
  const alreadyThere = address ? offered.some((a) => same(a.address, address)) : offered.length > 0;
  if (!alreadyThere && authenticator.connect) {
    try {
      offered = await authenticator.connect();
    } catch (error) {
      host.notify?.('error', error instanceof Error ? error.message : `${authenticator.label} did not connect.`);
      throw error;
    }
  }

  let chosen = address;
  if (!chosen) {
    if (offered.length === 0) {
      const error = new AuthenticatorError('unauthorized', `${authenticator.label} offered no account.`, approverId);
      host.notify?.('error', error.message);
      throw error;
    }
    if (offered.length > 1) throw new ConnectChoiceRequired(approverId, offered);
    chosen = offered[0].address;
  }
  if (!offered.some((a) => same(a.address, chosen as string))) {
    const error = new AuthenticatorError('unauthorized', `${authenticator.label} does not hold ${chosen}.`, approverId);
    host.notify?.('error', error.message);
    throw error;
  }

  // Every check has passed: only now does anything the host owns change.
  await host.setActiveAuthenticator?.(chosen, approverId);
  await host.setActiveAccount(chosen);
  return { address: chosen, approverId };
}

export interface DisconnectParams {
  registry: AuthenticatorRegistry;
  /** The approver of the active account, when known: its permission is revoked if it supports that. */
  approverId?: AuthenticatorId;
  host: ConnectHost;
}

/** Disconnect: the wallet has no active account again. A failed permission revoke is reported but never blocks this. */
export async function disconnectAccount({ registry, approverId, host }: DisconnectParams): Promise<void> {
  const authenticator = approverId ? registry.get(approverId) : undefined;
  if (authenticator?.disconnect) {
    try {
      await authenticator.disconnect();
    } catch (error) {
      host.notify?.('warning', error instanceof Error ? `${authenticator.label}: ${error.message}` : `${authenticator.label} could not revoke its permission.`);
    }
  }
  await host.clearActiveAccount();
}
