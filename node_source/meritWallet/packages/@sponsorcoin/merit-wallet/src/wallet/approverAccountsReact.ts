// File: src/wallet/approverAccountsReact.ts
//
// 2026-10-12 (docs/design/accountAuthDesign.txt section 17 items 6 / 7): the React side of src/wallet/approverAccounts.ts. Reads the wallet's accounts and each backend's status whenever the wallet announces a change (a lock, an unlock, an
// installed wallet appearing, an accounts change) and when the page regains focus (an extension installed in another tab), and hands back the groups for the shared account list plus the banner text for a failed connect.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AccountListGroup } from '@sponsorcoin/spcoin-panels';
import type { AuthenticatorId, AuthenticatorStatus } from '../auth/authenticator';
import type { Wallet, WalletAccountEntry } from './wallet';
import { domPlatform } from '../platform/domPlatform';
import type { MeritPlatform } from '../platform/platform';
import { buildApproverGroups, createApproverController, type ApproverController, type ApproverHost } from './approverAccounts';

export interface ApproverAccounts {
  groups: AccountListGroup[] | undefined;
  /** A failed connect, in words; empty when there is none. */
  notice: string;
  clearNotice: () => void;
  controller: ApproverController | undefined;
}

export function useApproverAccounts(wallet: Wallet | undefined, host: ApproverHost | undefined, activeAddress: string | undefined, platform: MeritPlatform = domPlatform): ApproverAccounts {
  const [entries, setEntries] = useState<WalletAccountEntry[] | undefined>(undefined);
  const [statuses, setStatuses] = useState<Partial<Record<AuthenticatorId, AuthenticatorStatus>>>({});
  const [notice, setNotice] = useState('');
  const activeRef = useRef(activeAddress);
  activeRef.current = activeAddress;
  const hostRef = useRef(host);
  hostRef.current = host;

  const load = useCallback(async () => {
    if (!wallet) return;
    const next: Partial<Record<AuthenticatorId, AuthenticatorStatus>> = {};
    await Promise.all(
      wallet.backends().map(async (backend) => {
        try {
          const status = await wallet.registry.get(backend.id)?.status();
          if (status) next[backend.id] = status;
        } catch {
          next[backend.id] = { available: false, unlocked: false };
        }
      }),
    );
    const list = await wallet.accounts().catch(() => [] as WalletAccountEntry[]);
    setStatuses(next);
    setEntries(list);
  }, [wallet]);

  useEffect(() => {
    if (!wallet) return undefined;
    void load();
    const off = wallet.onChange(() => void load());
    const offForeground = platform.onForeground(() => void load());
    return () => {
      off();
      offForeground();
    };
  }, [wallet, load, platform]);

  const controller = useMemo(
    () =>
      wallet && host
        ? createApproverController(
            wallet,
            {
              ...host,
              // the controller reads the host through the ref, so a host that rebuilds its callbacks each render is never stale
              setActiveAccount: (address) => hostRef.current?.setActiveAccount(address),
              clearActiveAccount: () => hostRef.current?.clearActiveAccount(),
              setActiveAuthenticator: (address, id) => (hostRef.current?.setActiveAuthenticator ? hostRef.current.setActiveAuthenticator(address, id) : wallet.setActiveAuthenticator(address, id)),
            },
            setNotice,
            () => activeRef.current,
          )
        : undefined,
    [wallet, host],
  );

  const groups = useMemo(() => {
    if (!wallet || !host || !entries || !controller) return undefined;
    const activeApproverId = activeAddress ? wallet.backendIdFor(activeAddress) : undefined;
    const result = buildApproverGroups({
      backends: wallet.backends(),
      entries,
      statuses,
      activeAddress,
      activeApproverId,
      host: { ...host, openInstall: host.openInstall ?? ((url: string) => platform.openUrl(url)) },
      onConnect: (id) => void controller.connect(id).then(load),
      onDisconnect: (id) => void controller.disconnect(id).then(load),
      canConnect: (id) => typeof wallet.registry.get(id)?.connect === 'function',
    });
    return result;
  }, [wallet, host, entries, statuses, activeAddress, controller, load, platform]);

  return { groups, notice, clearNotice: () => setNotice(''), controller };
}
