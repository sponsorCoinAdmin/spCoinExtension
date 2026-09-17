// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/index.ts
//
// Moved here from node_source/spCoinPanels/engine/ (2026-09-10, same day)
// to match the sibling packages' layout (spCoinCommon/spCoinLib/
// spCoinAccess all use <root>/packages/@sponsorcoin/<name>/src) — required
// by app/api/spCoin/access-manager/route.ts's getPackageWorkspaceRoot(),
// which hardcodes that shape, so this package could be wired into the
// SpCoinAccessController "NPM Deployment" upload/download/install panel
// like the other three. No behavior change, only location + how the app
// imports it (bare `@sponsorcoin/spcoin-panels` specifier now, via a
// `file:` dependency, instead of the `@/node_source/spCoinPanels/engine`
// path alias).
//
// Merit's own independent panel-state engine — public surface. Deliberately
// small (2026-09-10, on request: "keep it simple for now, we will add
// more intricate options once we get this in a working state"). See
// docs/design/extensionPlan.md §7 for the full design/reasoning.

export { usePanelVisible } from './usePanelVisible';
export { default as MeritPanelGate } from './MeritPanelGate';

// 2026-09-14 — the self-contained wallet, per docs/design/extensionPlan.md's
// "Direction changed" entry: one shared MeritWallet component instead of
// two independently-rebuilt wallets, simplified further on direct request
// so a consumer just renders `<MeritWallet />` — see MeritWallet.tsx's own
// doc comment for the full reasoning.
export { default as MeritWallet } from './MeritWallet';
export type { MeritWalletProps, MeritWalletNetworkRow } from './MeritWallet';

// 2026-09-11 — first UI component in the package (previously engine-only,
// per this file's own "keep it simple" header note above). Portability
// pass done first (see AssetSelectDropDown.tsx's own inlined-truncateMiddle
// comment): no @/-aliased imports left, PanelGate is an injected prop
// rather than a hardcoded one, so this has no dependency on any one app's
// ExchangeContext/panel-tree — see extensionPlan.md's panel-tree discussion
// for the full reasoning.
export { default as AssetSelectDropDown, ASSET_SELECT_DISPLAY } from './AssetSelectDropDown';
export { default as ScrollTablePanel, type ScrollTablePanelProps } from './ScrollTablePanel';
export type { AssetSelectDropDownProps } from './AssetSelectDropDown';

// 2026-09-11 — second UI component ("Pages Grey header bar" slice, see
// docs/design/extensionPlan.md). Same portability pass as above: next/image
// swapped for <img>, the hardcoded MERIT_INFO_PANEL click handler replaced
// with an optional onTitleClick prop.
export { default as WalletHeader } from './WalletHeader';
export type { WalletHeaderProps } from './WalletHeader';
export { default as MeritTitleComponent } from './MeritTitleComponent';
export type { MeritTitleComponentProps } from './MeritTitleComponent';

// 2026-09-12 — third UI component: a placeholder for WALLET_ACCOUNT_HEADER.
// Unlike the two above, the real app version (PanelSubTitle.tsx) has no
// portable "shape" to copy yet — its content is a real account picker plus
// a live on-chain role-badge fetch, neither of which has anything real to
// show without an actual connected account. This is intentionally inert
// (every prop optional, safe do-nothing defaults) rather than a partial
// port of logic with nothing behind it yet.
export { default as WalletAccountHeader } from './WalletAccountHeader';
export type { WalletAccountHeaderProps, WalletAccountHeaderRoles } from './WalletAccountHeader';

// 2026-09-12 — fourth UI component: a placeholder for the network pill
// WalletHeader's own leftSlot carries in the real app (WALLET_NETWORK_HEADER
// IS WalletHeader + this pill, not a separate row — see
// components/views/MeritWalletComponent.tsx). Same "inert, no real data
// source yet" reasoning as WalletAccountHeader.
export { default as NetworkSelectDropDown } from './NetworkSelectDropDown';
export type { NetworkSelectDropDownProps } from './NetworkSelectDropDown';

// 2026-09-12 — fifth/sixth UI components: placeholders for
// AGENT_SELECT_DROP_DOWN and its parent AGENT_HEADER_PANEL. Same "inert,
// no real data source yet" reasoning as WalletAccountHeader/
// NetworkSelectDropDown above — see each file's own doc comment.
export { default as AgentSelectDropDown } from './AgentSelectDropDown';
export type { AgentSelectDropDownProps } from './AgentSelectDropDown';
export { default as AgentHeaderPanel } from './AgentHeaderPanel';
export type { AgentHeaderPanelProps } from './AgentHeaderPanel';

// 2026-09-12 — seventh/eighth UI components: placeholders for PANEL_TITLE
// (ActiveWalletPanelTitle/PopupHeader's back/title/menu bar) and
// MENU_TAB_HEADER_BAR (AccountPanelTabBar's Swap/Send/Sponsor/Rewards/
// Config tab strip — the panel itself is just a visibility flag with no
// children of its own, see panelRegistry.ts; this ports its actual visual
// content). Same "inert, no real panel-tree/wallet-lock data source yet"
// reasoning as every component above — see each file's own doc comment.
export { default as PanelTitle } from './PanelTitle';
export type { PanelTitleProps } from './PanelTitle';
export { default as MenuTabHeaderBar } from './MenuTabHeaderBar';
export type { MenuTabHeaderBarProps, MenuTabKey } from './MenuTabHeaderBar';

// 2026-09-12 — remaining RADIO_PANELS placeholders (all 24, per explicit
// instruction: "implement the placeholders, not the logic"). Same "inert,
// no real panel-tree/wallet/chain data source yet" reasoning as every
// component above — see each file's own doc comment. Several real panel
// ids share one component where the real app itself shares a shape
// (DetailPanelEmptyState covers all 11 ASSET_PANELS children; the list-
// shaped panels share GenericListPanel) — noted in each wrapper's own
// comment, not a shortcut taken silently.
export { default as MessagePanel } from './MessagePanel';
export type { MessagePanelProps, MessageKind } from './MessagePanel';
export { default as PasswordPanel } from './PasswordPanel';
export type { PasswordPanelProps } from './PasswordPanel';
export { default as MeritInfoPanel } from './MeritInfoPanel';
export type { MeritInfoPanelProps, MeritInfoRow } from './MeritInfoPanel';
export { default as WalletConfigPanel } from './WalletConfigPanel';
export type { WalletConfigPanelProps, OpenTarget } from './WalletConfigPanel';
export { default as ProcessFlowPanel } from './ProcessFlowPanel';
export type { ProcessFlowPanelProps } from './ProcessFlowPanel';

// Trade-shaped panels (TRADING_STATION_PANEL, SPONSORSHIP_PANEL, SEND_PANEL)
export { default as TradeAmountRow } from './TradeAmountRow';
export type { TradeAmountRowProps } from './TradeAmountRow';
// 2026-09-13 — EXCHANGE_TRADING_PAIR, split out of TradingStationPanel.tsx
// to match the real app's own component boundary (its own `<div id=
// "EXCHANGE_TRADING_PAIR">`, a sibling of CONNECT_TRADE_BUTTON/
// AFFILIATE_FEE/FEE_DISCLOSURE inside TRADING_STATION_PANEL, not something
// the outer panel wrapper owns) — see ExchangeTradingPair.tsx's own doc
// comment.
export { default as ExchangeTradingPair } from './ExchangeTradingPair';
export type { ExchangeTradingPairProps } from './ExchangeTradingPair';
export { default as TradingStationPanel } from './TradingStationPanel';
export type { TradingStationPanelProps } from './TradingStationPanel';
export { default as SponsorshipPanel } from './SponsorshipPanel';
export type { SponsorshipPanelProps } from './SponsorshipPanel';
export { default as SendTabPanel } from './SendTabPanel';
export type { SendTabPanelProps } from './SendTabPanel';

// List-shaped panels (ASSET_LIST_SELECT_PANEL, SPONSOR_STAKING_LIST,
// ACCOUNT_LIST_REWARDS_PANEL, MANAGE_SPONSORSHIPS_PANEL)
export { default as GenericListPanel } from './GenericListPanel';
export type { GenericListPanelProps, GenericListRow } from './GenericListPanel';
export { default as AssetListSelectPanel } from './AssetListSelectPanel';
export type { AssetListSelectPanelProps } from './AssetListSelectPanel';
export { default as SponsorStakingListPanel } from './SponsorStakingListPanel';
export type { SponsorStakingListPanelProps } from './SponsorStakingListPanel';
export { default as AccountListRewardsPanel } from './AccountListRewardsPanel';
export type { AccountListRewardsPanelProps } from './AccountListRewardsPanel';
export { default as ManageSponsorshipsPanel } from './ManageSponsorshipsPanel';
export type { ManageSponsorshipsPanelProps } from './ManageSponsorshipsPanel';
// 2026-09-14 — MANAGE_PENDING_REWARDS' own portable placeholder, nested
// inside ManageSponsorshipsPanel above rather than a sibling of it (same
// parent/child shape the real registry declares — see
// docs/design/extensionPlan.md's "Fourth slice" entry). Exported
// separately too, in case a future consumer wants it standalone.
export { default as RewardsPendingByAccountTypePanel } from './RewardsPendingByAccountTypePanel';
export type { RewardsPendingByAccountTypePanelProps } from './RewardsPendingByAccountTypePanel';
export { default as RewardRow } from './RewardRow';
export type { RewardRowProps } from './RewardRow';

// The shared "TOKEN META | INFO" list shape (2026-09-15) — covers all four
// ACTIVE_LIST_PANEL_MODES screens that share this layout (REMOTE_TOKEN_LIST/
// REMOTE_ACCOUNT_AGENT_LIST/REMOTE_ACCOUNT_RECIPIENT_LIST/REMOTE_ACCOUNT_LIST
// — see AssetListTable.tsx's own doc comment). NETWORK_LIST and
// LOCAL_ACCOUNT_WALLET_LIST each have their own distinct layout — see
// NetworkListTable.tsx/AccountListCard.tsx further down.
export { default as AssetListRow } from './AssetListRow';
export type { AssetListRowProps } from './AssetListRow';
export { default as AssetListTable, ASSET_LIST_ROW_BG_A, ASSET_LIST_ROW_BG_B } from './AssetListTable';
export type { AssetListTableProps, AssetListEntry } from './AssetListTable';

// LOCAL_ACCOUNT_WALLET_LIST's own distinct layout (2026-09-15) — grouped
// Merit Wallet/MetaMask account list + "Add a Wallet/Account" button, see
// AccountListCard.tsx's own doc comment.
export { default as AccountListCard } from './AccountListCard';
export type { AccountListCardProps, AccountListGroup, AccountListEntry } from './AccountListCard';

// Portable, read-only ACCOUNT_PANEL slice (2026-09-16) — avatar.png +
// info.json fields for one account, opened via WalletAccountHeader's own
// avatar icon. See AccountDetailPanel.tsx's own doc comment for what this
// deliberately is/isn't a port of.
export { default as AccountDetailPanel } from './AccountDetailPanel';
export type { AccountDetailPanelProps } from './AccountDetailPanel';

// Portable, read-only token-list counterpart (2026-09-16, "do the same for
// the info.png in the lists") — opened via any token row's own info icon.
export { default as TokenDetailPanel } from './TokenDetailPanel';
export type { TokenDetailPanelProps } from './TokenDetailPanel';

// Portable, read-only network-list counterpart (same request) — opened via
// NetworkListRow's own icon, no caller round-trip needed (see that file's
// own doc comment on why).
export { default as NetworkDetailPanel } from './NetworkDetailPanel';
export type { NetworkDetailPanelProps } from './NetworkDetailPanel';

// NETWORK_LIST's own distinct layout (2026-09-15) — the third and last
// ACTIVE_LIST_PANEL_MODES screen, "Network Meta | Auth Source / Status"
// header + Merit/MetaMask per-row auth toggle + "Show Test Nets" footer,
// see NetworkListRow.tsx/NetworkListTable.tsx's own doc comments.
export { default as NetworkListRow } from './NetworkListRow';
export type { NetworkListRowProps, NetworkAuthSource } from './NetworkListRow';
export { default as NetworkListTable, NETWORK_LIST_ROW_BG_A, NETWORK_LIST_ROW_BG_B } from './NetworkListTable';
export type { NetworkListTableProps, NetworkListEntry } from './NetworkListTable';

// ASSET_PANELS' 11 children (ACCOUNT_PANEL, AGENT_PANEL, SPONSOR_PANEL,
// RECIPIENT_PANEL, TOKEN_PANEL, TOKEN_BUY_PANEL, TOKEN_SELL_PANEL,
// TOKEN_BUY_SWAP_PANEL, TOKEN_SELL_SWAP_PANEL, TOKEN_SEND_PANEL,
// NETWORK_PANEL) — each real version shows nothing but this one plain
// message box when nothing is selected, the only reachable state here.
export { default as DetailPanelEmptyState } from './DetailPanelEmptyState';
export type { DetailPanelEmptyStateProps } from './DetailPanelEmptyState';

// The single write chokepoint. A direct export, not a hook — meritPanelState
// .setVisible is already a stable, non-reactive class-field reference, so a
// hook wrapper would add nothing. Named `setPanelVisible` here to match the
// app's own existing naming (usePanelTree's setPanelVisible) for anyone
// porting call sites over.
import { meritPanelState } from './panelState';
export const setPanelVisible = meritPanelState.setVisible;
export const isPanelVisible = meritPanelState.isVisible;

// Exported for advanced/debug use (e.g. a future debug-tree equivalent) —
// not part of the normal read/write surface above.
export { meritPanelState } from './panelState';
export type { PanelId, MeritOnlyPanelId } from './panelState';
