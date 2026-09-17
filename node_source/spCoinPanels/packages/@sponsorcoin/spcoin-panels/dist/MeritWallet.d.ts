import { type MenuTabKey } from './MenuTabHeaderBar';
import { type OpenTarget } from './WalletConfigPanel';
import { type AssetListEntry } from './AssetListTable';
import { type AccountListGroup } from './AccountListCard';
import { type NetworkAuthSource } from './NetworkListRow';
/** Plain data shape for one NETWORK_LIST row — a consumer with a real feed
 *  (e.g. @sponsorcoin/spcoin-feeds/networks' toNetworkListEntries) passes
 *  these via the networkRows prop below instead of this component's own
 *  SAMPLE_NETWORK_ROWS. defaultAuthSource seeds this row's Merit/MetaMask
 *  toggle before the user ever touches it — omit to fall back to 'merit',
 *  matching this component's own prior (now-corrected) hardcoded default. */
export interface MeritWalletNetworkRow {
    id: string;
    symbol?: string;
    name?: string;
    isActive?: boolean;
    defaultAuthSource?: NetworkAuthSource;
    /** Drives the Show Test Nets filter below when networkRows is supplied —
     *  replaces this component's own prior hardcoded `row.id !== 'hardhat'`
     *  check, which only worked for SAMPLE_NETWORK_ROWS' own made-up ids. */
    isTestnet?: boolean;
    /** Full, already-resolved icon URL (e.g. spcoin-feeds/networks'
     *  NetworkRecord.logoURL prefixed with whatever origin the caller is
     *  pointed at) — a plain string, not a React.ReactNode, matching this
     *  component's own titleBadgeSrc/closeIconSrc/infoIconSrc convention.
     *  This component turns it into the actual <img> element below; the
     *  caller's job is only to resolve a URL that will actually load from
     *  wherever this component is rendered (same reasoning as those other
     *  three props' own doc comments). */
    iconSrc?: string;
}
export interface MeritWalletProps {
    /** Docked (full-height, square corners, no right border — a split-pane
     *  layout) vs. floating/dialog (rounded corners, capped height). Default
     *  false. */
    docked?: boolean;
    /** Drops the web app's 364px cap in favor of a plain 100% width — for a
     *  consumer (like a Chrome side panel) that's already narrow and
     *  user-resizable rather than floating inside a wider page. Default
     *  false. */
    fullWidth?: boolean;
    /** Forwarded to the header's close (X) button. Required — every real
     *  consumer needs a way to close this. */
    onClose: () => void;
    /** Forwarded to WalletHeader's own titleBadgeSrc — override for a
     *  consumer whose default asset path won't resolve (see
     *  WalletHeader.tsx's own doc comment on why the extension needs this). */
    titleBadgeSrc?: string;
    onRefresh?: () => void;
    refreshing?: boolean;
    /** Forwarded to WalletHeader's own closeIconSrc — see that file's own
     *  doc comment on why the extension swaps the close X for this. */
    closeIconSrc?: string;
    /** Forwarded to every AssetListRow's own infoIconSrc (see that file's
     *  doc comment) — same "extension bundles its own copy, passes
     *  chrome.runtime.getURL(...)" reasoning as titleBadgeSrc/closeIconSrc
     *  above. Omit to use AssetListRow's own default (the web app's hosted
     *  path), correct when this component is embedded directly in that app. */
    infoIconSrc?: string;
    initialActiveTab?: MenuTabKey;
    onActiveTabChange?: (tab: MenuTabKey) => void;
    initialMenuOpen?: boolean;
    onMenuOpenChange?: (open: boolean) => void;
    initialOpenTarget?: OpenTarget;
    onOpenTargetChange?: (target: OpenTarget) => void;
    networkRows?: MeritWalletNetworkRow[];
    accountGroups?: AccountListGroup[];
    tokenRows?: AssetListEntry[];
    recipientRows?: AssetListEntry[];
    onAccountRowSelect?: (accountId: string) => void;
    onNetworkRowSelect?: (networkId: string) => void;
    onAccountIconClick?: (address: string) => void;
    /** Data to render in the account-details overlay once
     *  onAccountIconClick's caller has resolved it. `address` gates which
     *  click this answers — this component shows a loading state for any
     *  address that doesn't (yet) match the one currently being viewed,
     *  rather than briefly flashing a stale previous account's details. */
    accountDetail?: {
        address: string;
        avatarSrc?: string;
        name?: string;
        symbol?: string;
        email?: string;
        website?: string;
        description?: string;
    } | null;
    onTokenIconClick?: (address: string) => void;
    tokenDetail?: {
        address: string;
        logoSrc?: string;
        name?: string;
        symbol?: string;
        decimals?: number;
        website?: string;
        explorer?: string;
        description?: string;
    } | null;
    onNetworkIconClick?: (networkId: string) => void;
}
export default function MeritWallet({ docked, fullWidth, onClose, titleBadgeSrc, onRefresh, refreshing, closeIconSrc, infoIconSrc, initialActiveTab, onActiveTabChange, initialMenuOpen, onMenuOpenChange, initialOpenTarget, onOpenTargetChange, networkRows, accountGroups, tokenRows, recipientRows, onAccountRowSelect, onNetworkRowSelect, onAccountIconClick, accountDetail, onTokenIconClick, tokenDetail, onNetworkIconClick, }: MeritWalletProps): import("react/jsx-runtime").JSX.Element;
