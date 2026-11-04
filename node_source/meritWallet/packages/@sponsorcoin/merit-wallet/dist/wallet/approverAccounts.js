import { connectAccount, disconnectAccount, ConnectChoiceRequired } from '../auth/connect';
const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
/**
 * 2026-11-03 (owner rule): a wallet such as MetaMask keeps ONE label per account, so the name and the symbol travel together as "Name,Symbol". Split at the first comma; a label with no comma is a name only.
 * Either half missing is filled from the public profile (describeAccount), and what is still missing reads N/A: the name is never copied into the symbol.
 */
export function splitNameSymbol(label) {
    const text = (label ?? '').trim();
    const comma = text.indexOf(',');
    if (comma < 0)
        return { name: text || undefined };
    return { name: text.slice(0, comma).trim() || undefined, symbol: text.slice(comma + 1).trim() || undefined };
}
/** Merge host-known accounts with accounts listed by wallet backends, joining duplicate addresses case-insensitively. */
export function mergeWalletAccountEntries(...sources) {
    const byAddress = new Map();
    for (const source of sources) {
        for (const entry of source) {
            const key = entry.address.toLowerCase();
            const existing = byAddress.get(key);
            if (existing) {
                for (const backend of entry.backends)
                    if (!existing.backends.includes(backend))
                        existing.backends.push(backend);
                existing.name || (existing.name = entry.name);
            }
            else {
                byAddress.set(key, { ...entry, backends: [...entry.backends] });
            }
        }
    }
    return Array.from(byAddress.values());
}
/** The groups for the shared account list. Pure: the statuses and the entries are read by the caller. */
export function buildApproverGroups(input) {
    const { backends, entries, statuses, activeAddress, activeApproverId, host } = input;
    const groups = backends.map((backend) => {
        const status = statuses[backend.id];
        const isActiveSource = !!activeAddress && activeApproverId === backend.id;
        const held = entries.filter((entry) => entry.backends.includes(backend.id));
        const accounts = held.map((entry) => {
            const known = host.describeAccount?.(entry.address);
            const label = splitNameSymbol(entry.name);
            // 2026-11-03: a default label ("Account 1", "Wallet 2 Account 3") is no name the person chose; the public profile's name, when there is one, wins over it
            if (label.name && /^(Wallet \d+ )?Account \d+$/i.test(label.name) && known?.name)
                label.name = undefined;
            return {
                id: entry.address,
                symbol: label.symbol || known?.symbol || 'N/A',
                name: label.name || known?.name || 'N/A',
                iconSrc: known?.iconSrc,
                address: entry.address,
                isActive: isActiveSource && same(entry.address, activeAddress),
            };
        });
        const group = {
            id: backend.id,
            label: backend.name,
            isActiveSource,
            initiallyCollapsed: !isActiveSource,
            accounts,
        };
        if (isActiveSource) {
            group.onActiveClick = () => input.onDisconnect(backend.id);
            return group;
        }
        // the native wallet is us: connected by definition, so it is never offered Install, Unlock or Connect
        if (backend.id === host.nativeWalletId) {
            group.connected = true;
            return group;
        }
        // 2026-10-31 (owner: "even though we are not the active wallet, can't we stay connected?"): connected is the wallet's own permission for this site (an injected wallet answers eth_accounts with the shared accounts), not whether it holds the ACTIVE account.
        // Choosing another wallet's account changes the active account only; the permission stays until the person disconnects. A click on the green badge disconnects it.
        if (status?.available && status.unlocked && accounts.length > 0 && input.canConnect(backend.id)) {
            group.connected = true;
            group.onActiveClick = () => input.onDisconnect(backend.id);
            return group;
        }
        const url = host.installUrl?.(backend.id);
        if (status && !status.available) {
            if (url) {
                group.connectLabel = 'Install';
                group.onConnectClick = () => host.openInstall?.(url);
            }
        }
        else if (status && status.available && !status.unlocked && backend.features.lock && host.onUnlock) {
            group.connectLabel = 'Unlock';
            group.onConnectClick = () => host.onUnlock?.(backend.id);
        }
        else if (status && status.available && input.canConnect(backend.id)) {
            group.connectLabel = 'Connect';
            group.onConnectClick = () => input.onConnect(backend.id);
        }
        return group;
    });
    if (input.onAddAccounts)
        for (const group of groups)
            group.addAccounts = { onClick: () => input.onAddAccounts(group.id) };
    const native = host.nativeWalletId;
    const kept = input.showDisconnected
        ? groups
        : groups.filter((g) => {
            if (g.id === native || g.isActiveSource)
                return true;
            const connected = host.isConnected?.(g.id);
            if (connected !== undefined)
                return connected;
            return g.accounts.length > 0 || g.connectLabel === 'Unlock';
        });
    // the native wallet first, the others in the wallet's own order
    return native ? [...kept.filter((g) => g.id === native), ...kept.filter((g) => g.id !== native)] : kept;
}
/** The words a failed connect is reported in. */
export function connectNoticeText(error) {
    return error instanceof Error && error.message ? error.message : 'That account could not be connected.';
}
/** The connect / disconnect operations of one wallet, wired to the host, with failures reported as text. */
export function createApproverController(wallet, host, onNotice, getActiveAddress) {
    const connectHost = {
        setActiveAccount: host.setActiveAccount,
        setActiveAuthenticator: host.setActiveAuthenticator ?? ((address, id) => wallet.setActiveAuthenticator(address, id)),
        clearActiveAccount: host.clearActiveAccount,
        notify: (_level, text) => onNotice(text),
    };
    return {
        async connect(approverId, address) {
            onNotice('');
            try {
                await connectAccount({ registry: wallet.registry, approverId, address, host: connectHost });
                return true;
            }
            catch (error) {
                // notify() already told the user for the cases connectAccount knows; a choice among several accounts is not an error here (the list shows them after the connect).
                if (error instanceof ConnectChoiceRequired)
                    return false;
                onNotice(connectNoticeText(error));
                return false;
            }
        },
        async disconnect(approverId) {
            onNotice('');
            const active = getActiveAddress();
            const id = approverId ?? (active ? wallet.backendIdFor(active) : undefined);
            try {
                // 2026-10-31: a wallet that does not hold the active account can be disconnected (its permission revoked) without touching the active account.
                const holdsActive = !active || !id || wallet.backendIdFor(active) === id;
                await disconnectAccount({ registry: wallet.registry, approverId: id, host: holdsActive ? connectHost : { ...connectHost, clearActiveAccount: () => undefined } });
            }
            catch (error) {
                onNotice(connectNoticeText(error));
            }
        },
    };
}
