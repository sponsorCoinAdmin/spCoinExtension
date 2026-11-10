// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/accountSource.ts
//
// 2026-11-08 (owner, docs/design/removeAccountPlan.txt rows 3, 5, 7; rules X2, X3, X7): who HOLDS an account, as the Account Details screen needs to know it.
//   - held by a wallet that keeps keys itself (a vault: the web keystore, the extension's vault): a LOCAL account. Its removal is the local delete (a later row); nothing is offered here;
//   - held only by other wallets (MetaMask, the other Merit wallet): the Private Key row reads "Held by <wallet>" (we never have that key), and when that wallet can remove accounts (Authenticator.removeAccount) the screen offers "Remove from Merit".
// The ACTIVE account is never removable (X2). Pure over the wallet: the screen asks, nothing here draws.
import type { Wallet } from '../wallet/wallet';
import { authenticatorName } from '../auth/authenticator';

/** What removing an account says and does (the confirm dialog's words, and the call). */
export interface AccountRemoval {
  /** The button's words ("Remove from Merit"). */
  label: string;
  /** Red (true) when the removal destroys something, as deleting a local account does; neutral blue when it only drops access that can be given again (another wallet's account). */
  destructive: boolean;
  /** Set when the button is shown but cannot be used; says why. */
  disabledReason?: string;
  title: string;
  message: string;
  confirmLabel: string;
  /** Remove the account; rejects with a readable message when the wallet cannot. */
  remove(): Promise<void>;
}

export interface AccountSource {
  /** The wallet that holds the account when it is not this app's own ("MetaMask", "Merit (Ext)"): the Private Key row says so. */
  heldBy?: string;
  /** 2026-11-08 (owner): the screen's title names the wallet and whether the account is its own: "MetaMask Remote Account Details", "Merit Local Account Details". */
  title: string;
  removal?: AccountRemoval;
}

const same = (a: string | undefined, b: string | undefined) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/**
 * 2026-11-08 (owner): the SAME address can sit in two groups (the local Merit account and MetaMask's copy of it). `groupId` is the group of the row the person opened; it
 * decides which of the wallets holding the address the screen is about. Omitted (the header icon): the local account wins, as before.
 */
export async function resolveAccountSource(wallet: Wallet, address: string, activeAddress: string | undefined, groupId?: string, symbol?: string): Promise<AccountSource | undefined> {
  const holders = [];
  for (const authenticator of wallet.registry.list()) {
    try {
      const known = authenticator.knownAccounts ? await authenticator.knownAccounts() : undefined;
      const listed = known ? known.map((a) => a.address) : (await authenticator.accounts()).map((a) => a.address);
      if (listed.some((a) => same(a, address))) holders.push(authenticator);
    } catch {
      /* a wallet that cannot be asked now holds nothing for this purpose */
    }
  }
  if (holders.length === 0) return undefined;
  const opened = groupId ? holders.find((a) => a.id === groupId) : undefined;
  // 2026-11-09 (owner): the button names what it removes and from where: "Remove Remote Doggie from Merit (Web App)"
  const app = authenticatorName(wallet.registry.list().find((a) => !!a.vault) ?? holders[0]);
  const what = symbol && symbol !== 'N/A' ? symbol : 'Account';
  const isLocal = opened ? !!opened.vault : holders.some((a) => !!a.vault);
  if (isLocal) {
    // The local delete is a later row (docs/design/removeAccountPlan.txt rows 7 and 8): the button is drawn so it is not missed, and cannot be used yet.
    const active = same(address, activeAddress);
    return {
      title: 'Merit Local Account Details',
      removal: {
        label: `Remove Local ${what} from ${app}`,
        destructive: true,
        disabledReason: active ? 'Make another account active first.' : 'To do: deleting a local account is not built yet.',
        title: 'Delete account?',
        message: '',
        confirmLabel: 'Delete',
        remove: async () => {
          throw new Error('Deleting a local account is not built yet.');
        },
      },
    };
  }
  const owner = opened ?? holders[0];
  const wallets = authenticatorName(owner);
  const source: AccountSource = { heldBy: wallets, title: `${wallets} Remote Account Details` };
  const remover = (opened ? [opened] : holders).find((a) => typeof a.removeAccount === 'function');
  if (remover) {
    const name = authenticatorName(remover);
    source.removal = {
      label: `Remove Remote ${what} from ${app}`,
      destructive: false,
      ...(same(address, activeAddress) ? { disabledReason: 'Make another account active first.' } : {}),
      title: `Remove remote ${name} Account\nFrom ${app}?`,
      message: `This only removes the account from Merit. It still exists in ${name}; connect it again to add it back.`,
      confirmLabel: 'Remove',
      remove: async () => remover.removeAccount!(address),
    };
  }
  return source;
}
