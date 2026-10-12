// File: src/wallet/approverAccounts.ts
//
// 2026-10-12 (docs/connectionDesign.txt items 6 / 7 and docs/authenticationDesign.txt rows 8 / 9): the account list per approver. The list is built from the wallet (its registered backends), one group per approver, in the
// same words in every host; choosing a row connects that account through the one connect operation (src/auth/connect.ts), and a failure is reported in the list's banner and never changes the active account (connectionDesign 2.6, Q3).
//
// The group's badge says where the approver stands (the model, connectionDesign 2.1 / 2.8):
//   ACTIVE      the active account is held by this approver (a click disconnects)
//   Install     the approver is not installed / reachable and the host can send the user to it
//   Unlock      the approver is there but locked (the host shows its unlock screen)
//   Connect     the approver is reachable and holds no account here yet (a click connects: its own account picker)
//   INACTIVE    anything else (red, no action)
import type { AccountListGroup, AccountListEntry } from '@sponsorcoin/spcoin-panels';
import type { AuthenticatorId, AuthenticatorStatus } from '../auth/authenticator';
import { connectAccount, disconnectAccount, ConnectChoiceRequired, type ConnectHost } from '../auth/connect';
import type { Wallet, WalletAccountEntry, WalletBackendInfo } from './wallet';

/** What the host supplies for the connect operation (it owns the active account) and for the two states that need the host's own screens. */
export interface ApproverHost extends Pick<ConnectHost, 'setActiveAccount' | 'clearActiveAccount' | 'setActiveAuthenticator'> {
  /** Where to send the user to install this approver (an extension store page), or undefined when it cannot be installed from here. */
  installUrl?: (approverId: AuthenticatorId) => string | undefined;
  /** Show this approver's unlock screen (a password prompt, the wallet's own popup). Omitted: the group shows no Unlock action. */
  onUnlock?: (approverId: AuthenticatorId) => void;
  /** Open an install page. Default: window.open in a new tab. */
  openInstall?: (url: string) => void;
  /** The words for a row's name, symbol and avatar when the host knows more than the approver does (the account profiles). */
  describeAccount?: (address: string) => { symbol?: string; name?: string; iconSrc?: string } | undefined;
  /** The title of an approver's group when the host words it differently from the approver's own label ('Merit Wallet' for the extension's vault). */
  groupLabel?: (backend: WalletBackendInfo) => string | undefined;
}

export interface ApproverGroupsInput {
  backends: WalletBackendInfo[];
  entries: WalletAccountEntry[];
  statuses: Partial<Record<AuthenticatorId, AuthenticatorStatus>>;
  /** The wallet's active account, if any. */
  activeAddress?: string;
  /** The approver of the active account (wallet.backendIdFor(active)). */
  activeApproverId?: AuthenticatorId;
  host: Pick<ApproverHost, 'installUrl' | 'onUnlock' | 'openInstall' | 'describeAccount' | 'groupLabel'>;
  onConnect: (approverId: AuthenticatorId) => void;
  onDisconnect: (approverId: AuthenticatorId) => void;
  /** Whether a backend can connect an account by asking (remote approvers); keys kept here are chosen from the list instead. */
  canConnect: (approverId: AuthenticatorId) => boolean;
}

const same = (a: string | undefined, b: string | undefined) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** The groups for the shared account list. Pure: the statuses and the entries are read by the caller. */
export function buildApproverGroups(input: ApproverGroupsInput): AccountListGroup[] {
  const { backends, entries, statuses, activeAddress, activeApproverId, host } = input;
  return backends.map((backend) => {
    const status = statuses[backend.id];
    const isActiveSource = !!activeAddress && activeApproverId === backend.id;
    const held = entries.filter((entry) => entry.backends.includes(backend.id));
    const accounts: AccountListEntry[] = held.map((entry) => {
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
    const group: AccountListGroup = {
      id: backend.id,
      label: host.groupLabel?.(backend) || backend.label,
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
    } else if (status && status.available && !status.unlocked && backend.features.lock && host.onUnlock) {
      group.connectLabel = 'Unlock';
      group.onConnectClick = () => host.onUnlock?.(backend.id);
    } else if (status && status.available && accounts.length === 0 && input.canConnect(backend.id)) {
      group.connectLabel = 'Connect';
      group.onConnectClick = () => input.onConnect(backend.id);
    }
    return group;
  });
}

/** The words a failed connect is reported in. */
export function connectNoticeText(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'That account could not be connected.';
}

export interface ApproverController {
  /** Connect an account (or, with no address, ask the approver: its own account picker). Reports a failure through `onNotice` and never changes the active account then. */
  connect(approverId: AuthenticatorId, address?: string): Promise<boolean>;
  disconnect(approverId?: AuthenticatorId): Promise<void>;
}

/** The connect / disconnect operations of one wallet, wired to the host, with failures reported as text. */
export function createApproverController(wallet: Wallet, host: ApproverHost, onNotice: (text: string) => void, getActiveAddress: () => string | undefined): ApproverController {
  const connectHost: ConnectHost = {
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
      } catch (error) {
        // notify() already told the user for the cases connectAccount knows; a choice among several accounts is not an error here (the list shows them after the connect).
        if (error instanceof ConnectChoiceRequired) return false;
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
      } catch (error) {
        onNotice(connectNoticeText(error));
      }
    },
  };
}
