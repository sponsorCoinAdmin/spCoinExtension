// File: src/wallet/approverAccounts.ts
//
// 2026-10-12 (docs/design/accountAuthDesign.txt section 17 items 6 / 7 and docs/design/accountAuthDesign.txt rows 8 / 9): the account list per approver. The list is built from the wallet (its registered backends), one group per approver, in the
// same words in every host; choosing a row connects that account through the one connect operation (src/auth/connect.ts), and a failure is reported in the list's banner and never changes the active account (docs/design/accountAuthDesign.txt section 17.2.6, Q3).
//
// The group's badge says where the approver stands (the model, docs/design/accountAuthDesign.txt section 17.2.1 / 2.8):
//   ACTIVE      the active account is held by this approver (a click disconnects)
//   Install     the approver is not installed / reachable and the host can send the user to it
//   Unlock      the approver is there but locked (the host shows its unlock screen)
//   Connect     the approver is reachable and is not the active source (2026-10-31: whether or not it holds accounts here) (a click connects: its own account picker)
//   INACTIVE    anything else (red, no action)
// 2026-10-15 (owner rule): the list shows only CONNECTED wallets, and the NATIVE wallet (the Merit wallet this app is, `nativeId`) is always first and always connected: it is us. Whether another wallet is connected is the host's one definition (`isConnected`, the same
// one the host's wallet list screen shows); a host that gives none gets the default below. Inactive ACCOUNTS are fine, a wallet that is not connected is not.
// (earlier wording, still true for the default:) a wallet that is not connected is NOT on the list at all, so a Ledger nobody connected, or a MetaMask that holds no account here, shows no group; connecting is the Add menu's job.
// A group stays when it is the active one, when it holds accounts, or when it is locked and offers Unlock. Install / Connect badges appear only when a host asks for the disconnected wallets (`showDisconnected`).
import type { AccountListGroup, AccountListEntry } from '@sponsorcoin/spcoin-panels';
import type { AuthenticatorId, AuthenticatorStatus } from '../auth/authenticator';
import { connectAccount, disconnectAccount, ConnectChoiceRequired, type ConnectHost } from '../auth/connect';
import type { Wallet, WalletAccountEntry, WalletBackendInfo } from './wallet';

/** What the host supplies for the connect operation (it owns the active account) and for the two states that need the host's own screens. */
/** 2026-11-03 (owner request): what kind of host this is, said by the host itself (injected, never sniffed by the component). */
export type ApproverHostPlatform = 'web' | 'extension' | 'android' | 'iphone';

export interface ApproverHost extends Pick<ConnectHost, 'setActiveAccount' | 'clearActiveAccount' | 'setActiveAuthenticator'> {
  /** Where to send the user to install this approver (an extension store page), or undefined when it cannot be installed from here. */
  installUrl?: (approverId: AuthenticatorId) => string | undefined;
  /** Show this approver's unlock screen (a password prompt, the wallet's own popup). Omitted: the group shows no Unlock action. */
  onUnlock?: (approverId: AuthenticatorId) => void;
  /** 2026-10-15: the id of the NATIVE wallet: the Merit wallet this host is (the web app's dev keystore, the extension's vault). Listed first, always connected, never offered Install or Connect. */
  nativeWalletId?: AuthenticatorId;
  /** 2026-11-03: the kind of app this host is. On the web and extension the running app's own "Add Account(s)" opens the Add menu (openAddMenu); on any other host it asks the wallet directly, as every remote wallet does. */
  platform?: ApproverHostPlatform;
  /** Show the Add menu (Add Wallet Authenticator or Account). The component supplies it for web and extension hosts. */
  openAddMenu?: () => void;
  /** 2026-10-15: is this wallet CONNECTED to the app? The host's one definition (the same its wallet list screen shows). undefined: no opinion, the default applies (it holds accounts here, or it is locked and offers Unlock). */
  isConnected?: (approverId: AuthenticatorId) => boolean | undefined;
  /** Open an install page. The component supplies the platform's openUrl when the host gives none. */
  openInstall?: (url: string) => void;
  /** The words for a row's name, symbol and avatar when the host knows more than the approver does (the account profiles). */
  describeAccount?: (address: string) => { symbol?: string; name?: string; iconSrc?: string } | undefined;
}

export interface ApproverGroupsInput {
  backends: WalletBackendInfo[];
  entries: WalletAccountEntry[];
  statuses: Partial<Record<AuthenticatorId, AuthenticatorStatus>>;
  /** The wallet's active account, if any. */
  activeAddress?: string;
  /** The approver of the active account (wallet.backendIdFor(active)). */
  activeApproverId?: AuthenticatorId;
  host: Pick<ApproverHost, 'installUrl' | 'onUnlock' | 'openInstall' | 'describeAccount' | 'nativeWalletId' | 'isConnected'>;
  onConnect: (approverId: AuthenticatorId) => void;
  onDisconnect: (approverId: AuthenticatorId) => void;
  /** Whether a backend can connect an account by asking (remote approvers); keys kept here are chosen from the list instead. */
  canConnect: (approverId: AuthenticatorId) => boolean;
  /** 2026-11-03 (owner request): every group's badge reads "Add Account(s)"; a click calls this with the wallet's id (open its account selection). The native wallet may have no action: return nothing. Omitted: the badges keep their Connected / Connect words. */
  onAddAccounts?: (approverId: AuthenticatorId) => void;
  /** Also list the wallets that are not connected (no accounts here), with their Install / Connect badges. Default false: they are not on the list. */
  showDisconnected?: boolean;
}

const same = (a: string | undefined, b: string | undefined) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/**
 * 2026-11-03 (owner rule): a wallet such as MetaMask keeps ONE label per account, so the name and the symbol travel together as "Name,Symbol". Split at the first comma; a label with no comma is a name only.
 * Either half missing is filled from the public profile (describeAccount), and what is still missing reads N/A: the name is never copied into the symbol.
 */
export function splitNameSymbol(label: string | undefined): { name?: string; symbol?: string } {
  const text = (label ?? '').trim();
  const comma = text.indexOf(',');
  if (comma < 0) return { name: text || undefined };
  return { name: text.slice(0, comma).trim() || undefined, symbol: text.slice(comma + 1).trim() || undefined };
}

/** Merge host-known accounts with accounts listed by wallet backends, joining duplicate addresses case-insensitively. */
export function mergeWalletAccountEntries(...sources: readonly (readonly WalletAccountEntry[])[]): WalletAccountEntry[] {
  const byAddress = new Map<string, WalletAccountEntry>();
  for (const source of sources) {
    for (const entry of source) {
      const key = entry.address.toLowerCase();
      const existing = byAddress.get(key);
      if (existing) {
        for (const backend of entry.backends) if (!existing.backends.includes(backend)) existing.backends.push(backend);
        existing.name ||= entry.name;
      } else {
        byAddress.set(key, { ...entry, backends: [...entry.backends] });
      }
    }
  }
  return Array.from(byAddress.values());
}

/** The groups for the shared account list. Pure: the statuses and the entries are read by the caller. */
export function buildApproverGroups(input: ApproverGroupsInput): AccountListGroup[] {
  const { backends, entries, statuses, activeAddress, activeApproverId, host } = input;
  const groups = backends.map((backend) => {
    const status = statuses[backend.id];
    const isActiveSource = !!activeAddress && activeApproverId === backend.id;
    const held = entries.filter((entry) => entry.backends.includes(backend.id));
    const accounts: AccountListEntry[] = held.map((entry) => {
      const known = host.describeAccount?.(entry.address);
      const label = splitNameSymbol(entry.name);
      // 2026-11-03: a default label ("Account 1", "Wallet 2 Account 3") is no name the person chose; the public profile's name, when there is one, wins over it
      if (label.name && /^(Wallet \d+ )?Account \d+$/i.test(label.name) && known?.name) label.name = undefined;
      return {
        id: entry.address,
        symbol: label.symbol || known?.symbol || 'N/A',
        name: label.name || known?.name || 'N/A',
        iconSrc: known?.iconSrc,
        address: entry.address,
        isActive: isActiveSource && same(entry.address, activeAddress),
      };
    });
    const group: AccountListGroup = {
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
    } else if (status && status.available && !status.unlocked && backend.features.lock && host.onUnlock) {
      group.connectLabel = 'Unlock';
      group.onConnectClick = () => host.onUnlock?.(backend.id);
    } else if (status && status.available && input.canConnect(backend.id)) {
      group.connectLabel = 'Connect';
      group.onConnectClick = () => input.onConnect(backend.id);
    }
    return group;
  });
  if (input.onAddAccounts) for (const group of groups) group.addAccounts = { onClick: () => input.onAddAccounts!(group.id as AuthenticatorId) };
  const native = host.nativeWalletId;
  const kept = input.showDisconnected
    ? groups
    : groups.filter((g) => {
        if (g.id === native || g.isActiveSource) return true;
        const connected = host.isConnected?.(g.id as AuthenticatorId);
        if (connected !== undefined) return connected;
        return g.accounts.length > 0 || g.connectLabel === 'Unlock';
      });
  // the native wallet first, the others in the wallet's own order
  return native ? [...kept.filter((g) => g.id === native), ...kept.filter((g) => g.id !== native)] : kept;
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
        // 2026-10-31: a wallet that does not hold the active account can be disconnected (its permission revoked) without touching the active account.
        const holdsActive = !active || !id || wallet.backendIdFor(active) === id;
        await disconnectAccount({ registry: wallet.registry, approverId: id, host: holdsActive ? connectHost : { ...connectHost, clearActiveAccount: () => undefined } });
      } catch (error) {
        onNotice(connectNoticeText(error));
      }
    },
  };
}
