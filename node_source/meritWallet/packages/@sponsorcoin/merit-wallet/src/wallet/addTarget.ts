// File: src/wallet/addTarget.ts
//
// 2026-10-12 (docs/createWalletAccountDesign.txt section 5): WHICH wallet the Add a Wallet/Account screen adds to. The screen acts on the ACTIVE WALLET (the one that holds the active account); with no active account it acts on the host's own wallet;
// a person can point it at another wallet that keeps keys. Each entry (Create Account, Import an account, Import a wallet) is then judged against the TARGET wallet's own capabilities and, when it cannot, shown disabled with the reason in
// that wallet's own name. Pure reading of the wallet: the screen (src/account/AddAccountFlow.tsx) draws it.
import type { AuthenticatorId } from '../auth/authenticator';
import type { Wallet, WalletFeatures } from './wallet';

export interface AddTarget {
  id: AuthenticatorId;
  /** The wallet's one name (walletName). */
  name: string;
  features: WalletFeatures;
}

export interface AddTargets {
  /** Every reachable wallet that keeps keys itself (a signing-only wallet has nothing to add keys to). In registration order. */
  targets: AddTarget[];
  /** The target when the person picked none: the active wallet when it keeps keys, else the first one (the host registers its own wallet first). */
  defaultId: AuthenticatorId | undefined;
}

export type AddKeyEntry = 'createAccount' | 'importAccount' | 'importWallet';

/** How long a wallet may take to say whether it can be reached before the screen goes on without it (a slow wallet must not hold the screen back). */
export const TARGET_STATUS_TIMEOUT_MS = 2000;

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | undefined> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(undefined); },
    );
  });

/**
 * The wallets the Add screen can add to, and which one it starts on. `only` limits the check to the wallets a host can really add keys to (the others are not even asked); each wallet is asked at the same time and
 * one that does not answer within TARGET_STATUS_TIMEOUT_MS is left out, so a slow one never holds the screen back.
 */
export async function readAddTargets(wallet: Pick<Wallet, 'backends' | 'registry' | 'backendIdFor'>, activeAddress: string | undefined, only?: readonly AuthenticatorId[]): Promise<AddTargets> {
  const candidates = wallet.backends().filter((backend) => backend.keepsKeys && (!only || only.includes(backend.id)));
  const answers = await Promise.all(candidates.map((backend) => withTimeout(Promise.resolve(wallet.registry.get(backend.id)?.status()), TARGET_STATUS_TIMEOUT_MS)));
  const targets: AddTarget[] = [];
  candidates.forEach((backend, i) => {
    if (answers[i]?.available) targets.push({ id: backend.id, name: backend.name, features: backend.features });
  });
  const active = activeAddress ? wallet.backendIdFor(activeAddress) : undefined;
  const defaultId = active && targets.some((t) => t.id === active) ? active : targets[0]?.id;
  return { targets, defaultId };
}

/** The reasons, in the target's own name, why an entry that adds keys cannot be used; an entry the target can do has none. */
export function addEntryReasons(target: AddTarget | undefined): Partial<Record<AddKeyEntry, string>> {
  if (!target) return {};
  const reasons: Partial<Record<AddKeyEntry, string>> = {};
  if (!target.features.addAccount) reasons.createAccount = `${target.name} cannot create accounts here.`;
  if (!target.features.importKey) reasons.importAccount = `${target.name} cannot import a private key: its keys are never typed in.`;
  if (!target.features.importPhrase) reasons.importWallet = `${target.name} cannot import a recovery phrase.`;
  return reasons;
}
