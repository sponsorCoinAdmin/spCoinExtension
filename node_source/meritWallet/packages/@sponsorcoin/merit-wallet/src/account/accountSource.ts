// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/accountSource.ts
//
// 2026-11-08 (owner, docs/design/removeAccountPlan.txt rows 3, 5, 7; rules X2, X3, X7): who HOLDS an account, as the Account Details screen needs to know it.
//   - held by a wallet that keeps keys itself (a vault: the web keystore, the extension's vault): a LOCAL account. Its removal is the local delete (a later row); nothing is offered here;
//   - held only by other wallets (MetaMask, the other Merit wallet): the Private Key row reads "Held by <wallet>" (we never have that key), and when that wallet can remove accounts (Authenticator.removeAccount) the screen offers "Remove from Merit".
// The ACTIVE account is never removable (X2). Pure over the wallet: the screen asks, nothing here draws.
import type { Wallet } from '../wallet/wallet';
import { authenticatorName } from '../auth/authenticator';
import { engineTrace } from '@sponsorcoin/spcoin-exchange-engine';
import { unlockErrorText } from '../wallet/walletLock';
import { holdersOf, removalTarget } from '../wallet/accountHolders';
import { sameAddress as same } from '../wallet/sameAddress';
import type { MessagePanelAcknowledgement } from '../panels/MessagePanelReal';

/** What removing an account says and does (the confirm dialog's words, and the call). */
export interface AccountRemoval {
  /** The button's words ("Remove from Merit"). */
  label: string;
  /** Red (true) when the removal destroys something, as deleting a local account does; neutral blue when it only drops access that can be given again (another wallet's account). */
  destructive: boolean;
  /** Set when the button is shown but cannot be used; says why. */
  disabledReason?: string;
  /** 2026-11-11 (owner): the one-line heading the wallet's title bar shows over the confirmation ("Remove Merit (Web App) Local Account"). */
  panelTitle: string;
  message: string;
  confirmLabel: string;
  /** 2026-11-10 (row 9): the notice shown in MESSAGE_PANEL once the account is removed ("Removed HH_BASE_9 from Merit (Web App)"). */
  doneMessage: string;
  /** A LOCAL account (its key is kept by this app): the dialog asks for the wallet password, passes it to remove(), and can show the key first (revealKey, which asks the vault again). Absent for another wallet's account. */
  local?: { /** Check boxes (with popups) to tick before Remove Account works. */ acknowledgements?: MessagePanelAcknowledgement[]; revealKey?(password: string): Promise<string>; };
  /** Remove the account; rejects with a readable message when the wallet cannot. A local account gets the wallet password. */
  remove(password?: string): Promise<void>;
}

export interface AccountSource {
  /** The wallet that holds the account when it is not this app's own ("MetaMask", "Merit (Ext)"): the Private Key row says so. */
  heldBy?: string;
  /** 2026-11-08 (owner): the screen's title names the wallet and whether the account is its own: "MetaMask Remote Account Details", "Merit Local Account Details". */
  title: string;
  removal?: AccountRemoval;
}


/**
 * 2026-11-08 (owner): the SAME address can sit in two groups (the local Merit account and MetaMask's copy of it). `groupId` is the group of the row the person opened; it
 * decides which of the wallets holding the address the screen is about. Omitted (the header icon): the local account wins, as before.
 */
export async function resolveAccountSource(wallet: Wallet, address: string, activeAddress: string | undefined, groupId?: string, symbol?: string): Promise<AccountSource | undefined> {
  const holders = await holdersOf(wallet.registry, address);
  if (holders.length === 0) return undefined;
  const { opened, isLocal } = removalTarget(holders, groupId);
  // 2026-11-09 (owner): the button names what it removes and from where: "Remove Remote Doggie from Merit (Web App)"
  const app = authenticatorName(wallet.registry.list().find((a) => !!a.vault) ?? holders[0]);
  const what = symbol && symbol !== 'N/A' ? symbol : 'Account';
  if (isLocal) {
    // 2026-11-10 (docs/design/removeAccountPlan.txt rows 7 and 8, rules X2, X5, X6): the LOCAL delete. The wallet password is asked in the dialog, the vault checks it and deletes (an imported key is erased, a phrase-derived account is hidden).
    const vault = (opened ?? holders.find((a) => !!a.vault))?.vault;
    const canDelete = !!vault?.removeAccount && vault.capabilities.removeAccount === true;
    // 2026-11-10 (owner: the button was disabled and the reason was unclear): why the Remove button is or is not usable
    engineTrace('accountSource:local', { address, activeAddress, isActive: same(address, activeAddress), groupId: groupId ?? null, holders: holders.map((a) => a.id), canDelete, hasRemoveAccount: !!vault?.removeAccount, flag: vault?.capabilities.removeAccount ?? null });
    const imported = (vault?.accounts().find((a) => same(a.address, address))?.source ?? 'imported') === 'imported';
    const warning = imported
      ? 'This account was imported from a private key. Removing it erases the key from this wallet. Without that key the account cannot be recovered, and all assets associated with it will be lost.'
      : 'This account is made from your Recovery Phrase. Removing it hides it here; only your Recovery Phrase can bring it back. Without the phrase, anything it holds is lost.';
    return {
      title: 'Merit Local Account Details',
      removal: {
        label: `Remove Local ${what} from ${app}`,
        destructive: true,
        ...(same(address, activeAddress) ? { disabledReason: 'Make another account active first.' } : !canDelete ? { disabledReason: 'This wallet cannot remove accounts.' } : {}),
        panelTitle: `Remove ${app} Local ${what}`,
        message: warning,
        confirmLabel: 'Remove Account',
        doneMessage: `Removed ${what} from ${app}`,
        local: {
          // 2026-11-10 (owner): two check boxes, each opening its own popup, that must both be ticked
          acknowledgements: [
            { id: 'balances', label: 'Lost Account Assets', title: 'Account Assets', message: 'Removing this account can result in total loss of associated assets or Sponsor Rewards involved in a Sponsorship Staking Contract, unless you possess the private key for account recovery.', choiceLabel: 'I understand and accept the risk.', acceptLabel: 'I accept the risk, Delete Anyway', rejectLabel: 'Reject' },
            { id: 'privateKey', label: 'Private Key Required for Recovery', title: 'Private Key Required for Recovery', message: 'If you do not save your private key, this account and all associated assets will not be recoverable.', choiceLabel: 'I understand and accept the risk.', acceptLabel: 'Confirm', rejectLabel: 'Cancel' },
          ],
          revealKey: vault?.capabilities.revealKey ? async (password: string) => {
            try {
              return await vault.revealPrivateKey({ kind: 'password', value: password }, address);
            } catch (error) {
              throw new Error(unlockErrorText(error));
            }
          } : undefined,
        },
        remove: async (password?: string) => {
          try {
            await wallet.removeAccount(address, { groupId, credential: { kind: 'password', value: password ?? '' } });
          } catch (error) {
            throw new Error(unlockErrorText(error));
          }
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
      panelTitle: `Remove ${app} Remote ${name} Account`,
      message: `This only removes the account from Merit. It still exists in ${name}; connect it again to add it back.`,
      confirmLabel: 'Remove',
      doneMessage: `Removed ${what} from ${app}`,
      remove: async () => wallet.removeAccount(address, { groupId }),
    };
  }
  return source;
}
