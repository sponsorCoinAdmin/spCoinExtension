import { authenticatorName } from '../auth/authenticator';
import { engineTrace } from '@sponsorcoin/spcoin-exchange-engine';
import { unlockErrorText } from '../wallet/walletLock';
import { holdersOf, removalTarget } from '../wallet/accountHolders';
import { encryptKeyExport } from '../vault/keyExport';
/** Plan row 13 is ON HOLD (owner, 2026-11-10): a key file can be guessed at offline. The code stays; this switch keeps the Save Encrypted Key File button off. */
const ENABLE_KEY_FILE_EXPORT = false;
const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
/**
 * 2026-11-08 (owner): the SAME address can sit in two groups (the local Merit account and MetaMask's copy of it). `groupId` is the group of the row the person opened; it
 * decides which of the wallets holding the address the screen is about. Omitted (the header icon): the local account wins, as before.
 */
export async function resolveAccountSource(wallet, address, activeAddress, groupId, symbol) {
    const holders = await holdersOf(wallet.registry, address);
    if (holders.length === 0)
        return undefined;
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
                title: `Remove Local ${what}\nFrom ${app}?`,
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
                    revealKey: vault?.capabilities.revealKey ? async (password) => {
                        try {
                            return await vault.revealPrivateKey({ kind: 'password', value: password }, address);
                        }
                        catch (error) {
                            throw new Error(unlockErrorText(error));
                        }
                    } : undefined,
                    // 2026-11-10 (plan row 13): the key as a file locked with the wallet password (the vault checks the password first)
                    // ON HOLD 2026-11-10 (owner: the file can be attacked offline with password guessing): switched off, so the button does not appear. Set ENABLE_KEY_FILE_EXPORT to true to bring it back.
                    exportKey: ENABLE_KEY_FILE_EXPORT && vault?.capabilities.revealKey ? async (password) => {
                        try {
                            return await encryptKeyExport(await vault.revealPrivateKey({ kind: 'password', value: password }, address), address, password);
                        }
                        catch (error) {
                            throw new Error(unlockErrorText(error));
                        }
                    } : undefined,
                },
                remove: async (password) => {
                    try {
                        await wallet.removeAccount(address, { groupId, credential: { kind: 'password', value: password ?? '' } });
                    }
                    catch (error) {
                        throw new Error(unlockErrorText(error));
                    }
                },
            },
        };
    }
    const owner = opened ?? holders[0];
    const wallets = authenticatorName(owner);
    const source = { heldBy: wallets, title: `${wallets} Remote Account Details` };
    const remover = (opened ? [opened] : holders).find((a) => typeof a.removeAccount === 'function');
    if (remover) {
        const name = authenticatorName(remover);
        source.removal = {
            label: `Remove Remote ${what} from ${app}`,
            destructive: false,
            ...(same(address, activeAddress) ? { disabledReason: 'Make another account active first.' } : {}),
            title: `Remove Remote ${name} Account\nFrom ${app}?`,
            panelTitle: `Remove ${app} Remote ${name} Account`,
            message: `This only removes the account from Merit. It still exists in ${name}; connect it again to add it back.`,
            confirmLabel: 'Remove',
            doneMessage: `Removed ${what} from ${app}`,
            remove: async () => wallet.removeAccount(address, { groupId }),
        };
    }
    return source;
}
