// File: src/auth/resolve.ts
//
// 2026-10-09 (docs/authenticationDesign.txt row 3, sections 5.1-5.5) -- the authenticator REGISTRY (which authenticators this host has) and the RESOLVER (which one signs for an account).
// Every account has exactly ONE active authenticator. The resolver picks it from the ACCOUNT, in this order (first match wins): (1) the account's saved active authenticator, (2) the source the account
// came from, (3) the app default. The NETWORK plays no part in the choice (a network can only restrict what an authenticator may do). If the chosen authenticator is not registered or not reachable the request
// fails with a clear, specific error and no other authenticator is asked (5.5). No behaviour change by itself: nothing calls this until getConnectedSigner is rewired onto it.
import { AuthenticatorError, type AccountAuthenticatorRef, type Authenticator, type AuthenticatorId } from './authenticator';

export interface AuthenticatorRegistry {
  /** Registers (or replaces) the authenticator with this id. Returns an unregister function. */
  register(authenticator: Authenticator): () => void;
  unregister(id: string): void;
  get(id: string): Authenticator | undefined;
  list(): Authenticator[];
  /** Called when the set of registered authenticators changes. Returns the unsubscribe function. */
  onChange(listener: () => void): () => void;
}

export function createAuthenticatorRegistry(): AuthenticatorRegistry {
  const byId = new Map<string, Authenticator>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  return {
    register(authenticator) {
      byId.set(authenticator.id, authenticator);
      notify();
      return () => {
        if (byId.get(authenticator.id) === authenticator) {
          byId.delete(authenticator.id);
          notify();
        }
      };
    },
    unregister(id) {
      if (byId.delete(id)) notify();
    },
    get: (id) => byId.get(id),
    list: () => [...byId.values()],
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Which authenticator id a given account should use. Pure; does not look at the registry. */
export function chooseAuthenticatorId(account: AccountAuthenticatorRef, appDefault: (account: AccountAuthenticatorRef) => AuthenticatorId | undefined): AuthenticatorId | undefined {
  return account.activeAuthenticator ?? account.sourceAuthenticator ?? appDefault(account);
}

export interface ResolveParams {
  registry: AuthenticatorRegistry;
  account: AccountAuthenticatorRef;
  /** Rule 3: the app default (web app: serverKeystore for the Hardhat accounts it holds, the injected wallet for connected ones; extension: localVault). */
  appDefault: (account: AccountAuthenticatorRef) => AuthenticatorId | undefined;
}

/** The authenticator that signs for `account`, or a specific AuthenticatorError explaining why there is none. Never falls back to another authenticator. */
export async function resolveAuthenticator({ registry, account, appDefault }: ResolveParams): Promise<Authenticator> {
  const id = chooseAuthenticatorId(account, appDefault);
  if (!id) throw new AuthenticatorError('unsupported', `No authenticator is set for ${account.address}.`);
  const authenticator = registry.get(id);
  if (!authenticator) throw new AuthenticatorError('unreachable', `The ${id} authenticator for ${account.address} is not available in this app.`, id);
  const status = await authenticator.status();
  if (!status.available) throw new AuthenticatorError('unreachable', `${authenticator.label} is not reachable (not installed, locked out or unplugged).`, id);
  return authenticator;
}

/**
 * The one-time migration of the old per-NETWORK setting (authSourceByChain: 'merit' | 'metamask') into per-ACCOUNT assignments (5.2): every account that exists on a network takes that network's
 * source. `chainsOf` says which networks an account exists on; the first chain with a saved source wins, and an account with no saved source is left unassigned (the app default then applies).
 */
export function migrateAuthSourceByChain(
  authSourceByChain: Record<string, 'merit' | 'metamask' | undefined>,
  accounts: { address: string; chainIds: number[] }[],
): Record<string, AuthenticatorId> {
  const out: Record<string, AuthenticatorId> = {};
  for (const account of accounts) {
    for (const chainId of account.chainIds) {
      const source = authSourceByChain[String(chainId)];
      if (!source) continue;
      out[account.address.toLowerCase()] = source === 'merit' ? 'serverKeystore' : 'injected:io.metamask';
      break;
    }
  }
  return out;
}
