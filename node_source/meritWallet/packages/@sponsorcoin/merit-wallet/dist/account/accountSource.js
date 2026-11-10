import { authenticatorName } from '../auth/authenticator';
const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
/**
 * 2026-11-08 (owner): the SAME address can sit in two groups (the local Merit account and MetaMask's copy of it). `groupId` is the group of the row the person opened; it
 * decides which of the wallets holding the address the screen is about. Omitted (the header icon): the local account wins, as before.
 */
export async function resolveAccountSource(wallet, address, activeAddress, groupId, symbol) {
    const holders = [];
    for (const authenticator of wallet.registry.list()) {
        try {
            const known = authenticator.knownAccounts ? await authenticator.knownAccounts() : undefined;
            const listed = known ? known.map((a) => a.address) : (await authenticator.accounts()).map((a) => a.address);
            if (listed.some((a) => same(a, address)))
                holders.push(authenticator);
        }
        catch {
            /* a wallet that cannot be asked now holds nothing for this purpose */
        }
    }
    if (holders.length === 0)
        return undefined;
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
    const source = { heldBy: wallets, title: `${wallets} Remote Account Details` };
    const remover = (opened ? [opened] : holders).find((a) => typeof a.removeAccount === 'function');
    if (remover) {
        const name = authenticatorName(remover);
        source.removal = {
            label: `Remove Remote ${what} from ${app}`,
            destructive: false,
            ...(same(address, activeAddress) ? { disabledReason: 'Make another account active first.' } : {}),
            title: 'Remove account from Merit?',
            message: `This only removes the account from Merit. It still exists in ${name}; connect it again to add it back.`,
            confirmLabel: 'Remove',
            remove: async () => remover.removeAccount(address),
        };
    }
    return source;
}
