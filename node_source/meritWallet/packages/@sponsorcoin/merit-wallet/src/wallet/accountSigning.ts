// File: src/wallet/accountSigning.ts
//
// 2026-10-12 (docs/authenticationDesign.txt row 15, 5.1 / 5.6): who signs for an account, and switching it. An account has exactly ONE active authenticator; the same key may sit in more than one holder (the user imported it twice, a
// development account is in the dev server and in a vault), and then switching is instant and loses nothing (5.6: the wallet never copies keys, it only records the choice). This file reads the choices (which holders have the account, which
// one is active, whether it can be reached) and makes the switch; the section in src/wallet/AccountSigningSection.tsx draws it.
import type { AuthenticatorId, AuthenticatorStatus } from '../auth/authenticator';
import type { Wallet } from './wallet';

export type HolderState = 'ready' | 'locked' | 'unreachable';

export interface SigningHolder {
  id: AuthenticatorId;
  label: string;
  /** Where its keys live ('this device', 'the dev server') or empty for a signing-only holder. */
  where: string;
  state: HolderState;
  isActive: boolean;
}

export interface SigningChoices {
  address: string;
  holders: SigningHolder[];
  /** The authenticator that signs for the account now (the saved choice, else the account's source, else the app default). */
  activeId: AuthenticatorId | undefined;
  /** The user's saved choice, or undefined when the app default decides. */
  savedId: AuthenticatorId | undefined;
  /** More than one holder has the account: there is something to switch. */
  canSwitch: boolean;
  /** One sentence when the active holder cannot sign right now, else ''. */
  warning: string;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const stateOf = (status: AuthenticatorStatus | undefined, canLock: boolean): HolderState => {
  if (!status || !status.available) return 'unreachable';
  if (!status.unlocked && canLock) return 'locked';
  return 'ready';
};

/** The words for an active holder that cannot sign: one message in every host. */
export function signingWarning(holder: Pick<SigningHolder, 'label' | 'state'> | undefined, others: number): string {
  if (!holder || holder.state === 'ready') return '';
  const choose = others > 0 ? ' Choose another holder of this account below, or open it and try again.' : ' Open it and try again.';
  if (holder.state === 'locked') return `${holder.label} is locked, so it cannot sign right now.${choose}`;
  return `${holder.label} is not reachable (not installed, locked out or unplugged), so it cannot sign right now.${choose}`;
}

/** Which holders have this account, which one signs, and whether it can be reached. */
export async function readSigningChoices(wallet: Wallet, address: string): Promise<SigningChoices> {
  const entries = await wallet.accounts();
  const entry = entries.find((e) => same(e.address, address));
  const activeId = wallet.backendIdFor(address);
  const savedId = wallet.getActiveAuthenticator(address);
  const ids = new Set<AuthenticatorId>(entry?.backends ?? []);
  if (activeId) ids.add(activeId);
  const holders: SigningHolder[] = [];
  for (const id of ids) {
    const info = wallet.backend(id);
    let status: AuthenticatorStatus | undefined;
    try {
      status = await wallet.registry.get(id)?.status();
    } catch {
      status = undefined;
    }
    holders.push({ id, label: info?.label ?? id, where: info?.where ?? '', state: stateOf(status, !!info?.features.lock), isActive: id === activeId });
  }
  const active = holders.find((h) => h.isActive);
  return { address, holders, activeId, savedId, canSwitch: holders.length > 1, warning: signingWarning(active, holders.length - 1) };
}

/** Make `id` the authenticator that signs for the account (instant; nothing is copied or lost). Resolves with the choices as they are afterwards. */
export async function chooseSigner(wallet: Wallet, address: string, id: AuthenticatorId | undefined): Promise<SigningChoices> {
  if (id !== undefined) {
    const choices = await readSigningChoices(wallet, address);
    if (!choices.holders.some((h) => h.id === id)) throw new Error(`${wallet.backend(id)?.label ?? id} does not hold this account.`);
  }
  wallet.setActiveAuthenticator(address, id);
  return readSigningChoices(wallet, address);
}
