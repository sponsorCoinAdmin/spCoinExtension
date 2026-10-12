import { connectAccount, disconnectAccount, ConnectChoiceRequired } from '../auth/connect';
const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
/** The groups for the shared account list. Pure: the statuses and the entries are read by the caller. */
export function buildApproverGroups(input) {
    const { backends, entries, statuses, activeAddress, activeApproverId, host } = input;
    return backends.map((backend) => {
        const status = statuses[backend.id];
        const isActiveSource = !!activeAddress && activeApproverId === backend.id;
        const held = entries.filter((entry) => entry.backends.includes(backend.id));
        const accounts = held.map((entry) => {
            const known = host.describeAccount?.(entry.address);
            return {
                id: entry.address,
                symbol: known?.symbol || entry.name || undefined,
                name: known?.name || entry.name || undefined,
                iconSrc: known?.iconSrc,
                address: entry.address,
                isActive: isActiveSource && same(entry.address, activeAddress),
            };
        });
        const group = {
            id: backend.id,
            label: host.groupLabel?.(backend) || backend.name,
            isActiveSource,
            initiallyCollapsed: !isActiveSource,
            accounts,
        };
        if (isActiveSource) {
            group.onActiveClick = () => input.onDisconnect(backend.id);
            return group;
        }
        const url = host.installUrl?.(backend.id);
        if (status && !status.available) {
            if (url) {
                group.connectLabel = 'Install';
                group.onConnectClick = () => (host.openInstall ? host.openInstall(url) : typeof window !== 'undefined' && window.open(url, '_blank', 'noopener'));
            }
        }
        else if (status && status.available && !status.unlocked && backend.features.lock && host.onUnlock) {
            group.connectLabel = 'Unlock';
            group.onConnectClick = () => host.onUnlock?.(backend.id);
        }
        else if (status && status.available && accounts.length === 0 && input.canConnect(backend.id)) {
            group.connectLabel = 'Connect';
            group.onConnectClick = () => input.onConnect(backend.id);
        }
        return group;
    });
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
                await disconnectAccount({ registry: wallet.registry, approverId: id, host: connectHost });
            }
            catch (error) {
                onNotice(connectNoticeText(error));
            }
        },
    };
}
