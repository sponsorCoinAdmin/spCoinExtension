// File: src/wallet/approverAccountsReact.ts
//
// 2026-10-12 (docs/design/accountAuthDesign.txt section 17 items 6 / 7): the React side of src/wallet/approverAccounts.ts. Reads the wallet's accounts and each backend's status whenever the wallet announces a change (a lock, an unlock, an
// installed wallet appearing, an accounts change) and when the page regains focus (an extension installed in another tab), and hands back the groups for the shared account list plus the banner text for a failed connect.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { engineTrace } from '@sponsorcoin/spcoin-exchange-engine';
import { accountNoticeStore } from '../auth/accountNoticeStore';
import { domPlatform } from '../platform/domPlatform';
import { buildApproverGroups, createApproverController } from './approverAccounts';
export function useApproverAccounts(wallet, host, activeAddress, platform = domPlatform) {
    const [entries, setEntries] = useState(undefined);
    const [statuses, setStatuses] = useState({});
    const [notice, setNotice] = useState('');
    // 2026-11-06 (owner rule): the accounts of a wallet that belongs to another Merit wallet, each connected or disconnected (Authenticator.knownAccounts)
    const [known, setKnown] = useState({});
    const activeRef = useRef(activeAddress);
    activeRef.current = activeAddress;
    const hostRef = useRef(host);
    hostRef.current = host;
    const loadSeq = useRef(0);
    // 2026-10-30, on request ("the Merit (Web App) list should be lazy loaded"): nothing waits for the slowest wallet any more. The accounts of each backend show as soon as that backend answers,
    // and each backend's status badge fills in on its own; a slow or absent wallet (an injected wallet, a hardware device) only delays its own group.
    const load = useCallback(async () => {
        if (!wallet)
            return;
        const seq = ++loadSeq.current;
        const current = () => seq === loadSeq.current;
        const statusJobs = wallet.backends().map(async (backend) => {
            let status;
            try {
                status = await wallet.registry.get(backend.id)?.status();
            }
            catch {
                status = { available: false, unlocked: false };
            }
            if (status && current())
                setStatuses((previous) => ({ ...previous, [backend.id]: status }));
        });
        const accountsJob = wallet
            .accounts((partial) => {
            if (current())
                setEntries(partial);
        })
            .then((list) => {
            if (current())
                setEntries(list);
        })
            .catch(() => {
            if (current())
                setEntries([]);
        });
        const knownJobs = wallet.backends().map(async (backend) => {
            const listed = wallet.registry.get(backend.id)?.knownAccounts;
            if (!listed)
                return;
            try {
                const accountsKnown = await listed.call(wallet.registry.get(backend.id));
                if (current())
                    setKnown((previous) => ({ ...previous, [backend.id]: accountsKnown }));
            }
            catch {
                /* the list stays as it was */
            }
        });
        await Promise.all([...statusJobs, accountsJob, ...knownJobs]);
    }, [wallet]);
    useEffect(() => {
        if (!wallet)
            return undefined;
        void load();
        const off = wallet.onChange(() => void load());
        const offForeground = platform.onForeground(() => void load());
        // a wallet that tells the person the other wallet took accounts out of its list: a popup in MESSAGE_PANEL with the accounts' icons (src/auth/useAccountNoticeMessagePanel.ts)
        const offNotices = wallet.backends().map((backend) => wallet.registry.get(backend.id)?.onNotice?.((message, addresses) => {
            engineTrace('accountNotice:heard', { id: backend.id, message, accounts: addresses?.length ?? 0 });
            accountNoticeStore.publish(message, addresses ?? []);
        }));
        return () => {
            offNotices.forEach((stop) => stop?.());
            off();
            offForeground();
        };
    }, [wallet, load, platform]);
    const controller = useMemo(() => wallet && host
        ? createApproverController(wallet, {
            ...host,
            // the controller reads the host through the ref, so a host that rebuilds its callbacks each render is never stale
            setActiveAccount: (address) => hostRef.current?.setActiveAccount(address),
            clearActiveAccount: () => hostRef.current?.clearActiveAccount(),
            setActiveAuthenticator: (address, id) => (hostRef.current?.setActiveAuthenticator ? hostRef.current.setActiveAuthenticator(address, id) : wallet.setActiveAuthenticator(address, id)),
        }, setNotice, () => activeRef.current)
        : undefined, [wallet, host]);
    const groups = useMemo(() => {
        if (!wallet || !host || !entries || !controller)
            return undefined;
        const activeApproverId = activeAddress ? wallet.backendIdFor(activeAddress) : undefined;
        const result = buildApproverGroups({
            backends: wallet.backends(),
            entries,
            statuses,
            activeAddress,
            activeApproverId,
            host: { ...host, openInstall: host.openInstall ?? ((url) => platform.openUrl(url)) },
            // a remote Merit wallet connects and disconnects the way the wallet list does (host.walletConnect / walletDisconnect); every other wallet through the controller
            onConnect: (id) => {
                // 2026-11-07 (owner: a Ledger connect appeared after Add Account(s) on Merit (Extension)): who asked, with the call path
                engineTrace('approverAccounts:onConnect', { id, stack: String(new Error().stack ?? '').split(String.fromCharCode(10)).slice(2, 8).join(' | ') });
                const handled = host.walletConnect?.(id);
                if (handled)
                    void Promise.resolve(handled).catch((error) => setNotice(error instanceof Error && error.message ? error.message : 'The wallet could not be connected.')).then(load);
                else
                    void controller.connect(id).then(load);
            },
            onDisconnect: (id) => {
                const handled = host.walletDisconnect?.(id);
                if (handled)
                    void Promise.resolve(handled).catch(() => undefined).then(load);
                else
                    void controller.disconnect(id).then(load);
            },
            canConnect: (id) => typeof wallet.registry.get(id)?.connect === 'function',
            // "Add Account(s)": the wallet's own account selection (the native wallet holds its accounts here: nothing to ask)
            known,
            canToggleAccount: (id) => typeof wallet.registry.get(id)?.setAccountConnected === 'function',
            onToggleAccount: (id, address, connected) => {
                const approver = wallet.registry.get(id);
                engineTrace('approverAccounts:toggleAccount', { id, address, connected, hasHandler: typeof approver?.setAccountConnected === 'function' });
                void Promise.resolve(approver?.setAccountConnected?.(address, connected))
                    .catch((error) => setNotice(error instanceof Error && error.message ? error.message : 'That account could not be changed.'))
                    .then(load);
            },
            onAddAccounts: (id) => {
                engineTrace('approverAccounts:onAddAccounts', { id, nativeWalletId: host.nativeWalletId, platform: host.platform, hasOpenAddMenu: !!host.openAddMenu });
                // the running app's own wallet (web or extension): the Add menu. Every other wallet, and a host of any other kind: the wallet's own account selection.
                if (id === host.nativeWalletId && (host.platform === 'web' || host.platform === 'extension') && host.openAddMenu) {
                    host.openAddMenu();
                    return;
                }
                // 2026-11-06 (owner report: Add Account(s) on Merit (Web App) did nothing until pressed twice): the failure was swallowed without a trace, so a first press that threw was invisible; it is traced now
                if (id !== host.nativeWalletId) {
                    const approver = wallet.registry.get(id);
                    engineTrace('approverAccounts:addAccounts', { id, hasSelect: typeof approver?.selectAccounts === 'function', hasConnect: typeof approver?.connect === 'function' });
                    void Promise.resolve((approver?.selectAccounts ?? approver?.connect)?.call(approver))
                        .catch((error) => engineTrace('approverAccounts:addAccounts:failed', { id, code: error?.code, message: error instanceof Error ? error.message : String(error) }))
                        .then(load);
                }
            },
        });
        return result;
    }, [wallet, host, entries, statuses, activeAddress, controller, load, platform, known]);
    return { groups, notice, clearNotice: () => setNotice(''), controller };
}
