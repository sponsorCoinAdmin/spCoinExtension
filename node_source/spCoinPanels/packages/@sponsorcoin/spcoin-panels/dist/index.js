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
export { DEFAULT_DROPDOWN_IMAGE_SIZE } from './dropdownImageDefaults';
// 2026-09-21, Path A ("single source of truth so path a is the way") —
// this package's own components (MeritWallet.tsx and everything it
// composes) now use `PanelGate` below, bound to the real
// @sponsorcoin/spcoin-exchange-engine's usePanelVisible/panelStore, not
// this package's own separate meritPanelState.
//
// meritPanelState/MeritPanelGate/usePanelVisible below were briefly
// deleted the same day, then RESTORED after a real oversight was caught:
// the web app itself (not just this package's own components) has live,
// deliberate 2026-09-14 consumers of these three exports —
// components/views/Headers/WalletNetworkPanel.tsx,
// components/views/MeritWallet.tsx (the web app's own, separate
// component of the same name), AgentHeaderContainer.tsx, and the /Test
// page's own panel-tree debug tree (Branch.tsx) — that migrated
// WALLET_NETWORK_HEADER/MENU_TAB_HEADER_BAR onto this exact engine, a
// real design decision predating and out of scope for today's work. The
// first deletion pass only grepped this package's own src/ folder for
// importers, not the whole monorepo — confirmed via a full-repo grep
// before restoring, not assumed. `usePanelVisible`/`setPanelVisible`/
// `isPanelVisible`/`meritPanelState` stay exported below for exactly
// those real consumers; new code in this package itself should use
// `PanelGate`/the real engine instead.
export { default as PanelGate } from './PanelGate';
export { usePanelVisible } from './usePanelVisible';
export { default as MeritPanelGate } from './MeritPanelGate';
// 2026-09-22 — real shared code for WALLET_RADIO_PANELS, the gate both
// the Web App and the Extension use — see that file's own header comment.
export { default as WalletRadioPanels } from './WalletRadioPanels';
// 2026-09-14 — the self-contained wallet, per docs/design/extensionPlan.md's
// "Direction changed" entry: one shared MeritWallet component instead of
// two independently-rebuilt wallets, simplified further on direct request
// so a consumer just renders `<MeritWallet />` — see MeritWallet.tsx's own
// doc comment for the full reasoning.
export { default as MeritWallet } from './MeritWallet';
// 2026-09-11 — first UI component in the package (previously engine-only,
// per this file's own "keep it simple" header note above). Portability
// pass done first (see AssetSelectDropDown.tsx's own inlined-truncateMiddle
// comment): no @/-aliased imports left, PanelGate is an injected prop
// rather than a hardcoded one, so this has no dependency on any one app's
// ExchangeContext/panel-tree — see extensionPlan.md's panel-tree discussion
// for the full reasoning.
export { default as AssetSelectDropDown, ASSET_SELECT_DISPLAY } from './AssetSelectDropDown';
export { default as ScrollTablePanel } from './ScrollTablePanel';
// 2026-09-18 — first of the "real dropdown wrapper" group (Token/Account/
// Agent/Recipient/Pool SelectDropDown) to move in from the web app's
// node_source/spCoinPanels/AssetSelectDropDowns/ (real-but-not-portable
// glue folder) into the actual package — already dependency-free (no
// ExchangeContext hooks, no @/-aliased imports at all), see its own header
// comment for the one real change (next/image -> <img>). The other four
// still depend directly on ExchangeContext hooks that aren't portable yet.
export { default as PoolSelectDropDown, POOL_SELECT_DISPLAY } from './PoolSelectDropDown';
// 2026-09-11 — second UI component ("Pages Grey header bar" slice, see
// docs/design/extensionPlan.md). Same portability pass as above: next/image
// swapped for <img>, the hardcoded MERIT_INFO_PANEL click handler replaced
// with an optional onTitleClick prop.
export { default as WalletNetworkHeader, default as WalletHeader } from './WalletHeader';
export { useDraggablePopup } from './useDraggablePopup';
export { default as FloatingSelectPopup } from './FloatingSelectPopup';
export { default as TokenListOverlay } from './TokenListOverlay';
export { deriveButtonType, deriveButtonText, deriveBgClass, deriveNoPoolWarning, } from './ExchangeButtonDerivations';
export { default as MeritTitleComponent } from './MeritTitleComponent';
// 2026-09-12 — third UI component: a placeholder for WALLET_ACCOUNT_HEADER.
// Unlike the two above, the real app version (PanelSubTitle.tsx) has no
// portable "shape" to copy yet — its content is a real account picker plus
// a live on-chain role-badge fetch, neither of which has anything real to
// show without an actual connected account. This is intentionally inert
// (every prop optional, safe do-nothing defaults) rather than a partial
// port of logic with nothing behind it yet.
export { default as WalletAccountHeader } from './WalletAccountHeader';
// 2026-09-12 — fourth UI component: a placeholder for the network pill
// WalletHeader's own leftSlot carries in the real app (WALLET_NETWORK_HEADER
// IS WalletHeader + this pill, not a separate row — see
// components/views/MeritWalletComponent.tsx). Same "inert, no real data
// source yet" reasoning as WalletAccountHeader.
export { default as NetworkSelectDropDown } from './NetworkSelectDropDown';
// 2026-09-18, on request (the "make npm the single source of truth"
// migration) — first of the five real dropdown wrapper components
// (Token/Account/Agent/Recipient/Pool SelectDropDown) to go real, since it
// already had a dead, unused npm-side placeholder. The web app's real
// implementation (node_source/spCoinPanels/AssetSelectDropDowns/
// AgentSelectDropDown.tsx) is a comparatively thin wrapper: useAgentAccount
// + useOpenActiveListPanel + usePanelVisible + validateAccount, all
// ExchangeContext-runtime hooks that don't exist in a portable package yet.
// Same treatment TradeAmountRow got: every hook-derived value becomes an
// optional prop, the component itself stays entirely hook-free — a real
// caller (the web app's own AgentSelectDropDown, now a thin hook-wiring
// wrapper around this one) resolves the real values and feeds them in; an
// extension caller with no ExchangeContext yet can render this exact same
// component inert, same look as before this promotion, by simply omitting
// the optional props.
//
// Deliberately NOT built on AssetSelectDropDown (the package's other real,
// portable dropdown) despite the obvious shape overlap — AssetSelectDropDown
// is styled with real Tailwind utility classes (`flex`, `gap-1`,
// `rounded-lg`, etc.), and spCoinExtension still has no Tailwind pipeline
// (confirmed 2026-09-18: no tailwind.config/postcss.config there either),
// so those classes render unstyled in the one environment this package
// exists to serve. Kept this file's own original inline-style approach
// instead, same reasoning every other extension-bound component in this
// package already follows — this is a real, currently-latent gap in
// AssetSelectDropDown itself (fine today only because nothing in the
// extension's live UI renders it yet), flagged here rather than silently
// worked around by inheriting it into a second component.
export { default as AgentSelectDropDown } from './AgentSelectDropDown';
// 2026-09-27 — AccountAvatar: minimal portable avatar image component
// (display-only <img> with preload + fallback). The web app's own
// components/utility/AccountAvatar.tsx wraps this with ExchangeContext-bound
// click-to-open navigation — that layer stays web-app-only, the display
// rendering is shared. Unblocks AGENT_SELECT_DROP_DOWN in the extension.
export { default as AccountAvatar, getAccountRoleLabel } from './components/utility/AccountAvatar';
// 2026-09-18 — third of the "real dropdown wrapper" group, and the shared
// base Token/Agent/Recipient's own wrappers build on. Built on
// AssetSelectDropDown directly (see this file's own header comment on why
// that's safe/preferred over AgentSelectDropDown's inline-style approach).
export { default as AccountSelectDropDown, ACCOUNT_SELECT_DISPLAY } from './AccountSelectDropDown';
// 2026-09-18 — fourth of the "real dropdown wrapper" group. Built on
// AssetSelectDropDown directly, same reasoning as AccountSelectDropDown.
export { default as TokenSelectDropDown } from './TokenSelectDropDown';
// 2026-09-22 — real migration of AGENT_HEADER_PANEL, promoted from inert
// placeholder. Every piece of the web app's real
// components/views/Headers/AgentHeaderContainer.tsx that was already
// free of ExchangeContext coupling moves here directly (keyboard
// shortcuts Alt+A/Alt+M, panel-visibility reads/writes via
// usePanelTree/usePanelVisible/panelState, default-agent seeding,
// title/subtitle rendering, the AGENT_SELECT_DROP_DOWN div shell). The only
// non-portable pieces — useAgentAccount and hydrateAccountFromAddress —
// become callback props the web app's thin AgentHeaderContainer.tsx
// wrapper resolves and passes down. The web app's own
// AgentSelectDropDown hook-wiring wrapper is rendered as a child slot,
// same opaque-slot split TokenAddressComponent.tsx already uses.
export { default as AgentHeaderPanel } from './AgentHeaderPanel';
// 2026-09-12 — seventh/eighth UI components: placeholders for PANEL_TITLE
// (ActiveWalletPanelTitle/PopupHeader's back/title/menu bar) and
// MENU_TAB_HEADER_BAR (AccountPanelTabBar's Swap/Send/Sponsor/Rewards/
// Config tab strip — the panel itself is just a visibility flag with no
// children of its own, see panelRegistry.ts; this ports its actual visual
// content). Same "inert, no real panel-tree/wallet-lock data source yet"
// reasoning as every component above — see each file's own doc comment.
export { default as PanelTitle } from './PanelTitle';
export { default as MenuTabHeaderBar, TabRow } from './MenuTabHeaderBar';
// 2026-09-12 — remaining WALLET_RADIO_PANELS placeholders (all 24, per explicit
// instruction: "implement the placeholders, not the logic"). Same "inert,
// no real panel-tree/wallet/chain data source yet" reasoning as every
// component above — see each file's own doc comment. Several real panel
// ids share one component where the real app itself shares a shape
// (DetailPanelEmptyState covers all 11 ASSET_PANELS children; the list-
// shaped panels share GenericListPanel) — noted in each wrapper's own
// comment, not a shortcut taken silently.
export { default as MessagePanel } from './MessagePanel';
export { default as PasswordPanel } from './PasswordPanel';
export { default as MeritInfoPanel } from './MeritInfoPanel';
export { default as WalletConfigPanel } from './WalletConfigPanel';
// 2026-09-22, Phase B.2 Stage 4.c — the real (not placeholder) always-
// explicit transaction-confirmation gate for PROCESS_FLOW (128). Not a
// promotion of a prior placeholder — see its own header comment for why
// this deliberately isn't a port of the web app's real ProcessFlowPanel.tsx
// (auto-approve-by-default design, rejected for the extension). The
// package's own former ProcessFlowPanel.tsx placeholder (2026-09-12,
// settling-spinner-only, never consumed by either real app) was deleted
// 2026-09-24 once confirmed dead — this is the sole PROCESS_FLOW component
// in the package now.
export { default as TransactionConfirmPanel } from './TransactionConfirmPanel';
// 2026-09-22 — real, zero-coupling migration (FEE_DISCLOSURE/SPONSOR_FEE_DISCLOSURE).
export { default as FeeDisclosure } from './FeeDisclosure';
// 2026-09-22 — real, zero-coupling migrations (SEND_TITLE/SEND_TO_ADDRESS).
export { default as SendTitle } from './SendTitle';
export { default as SendToAddressComponent } from './SendToAddressComponent';
// 2026-09-22 — opaque-slot migration (AFFILIATE_FEE/SPONSOR_AFFILIATE_FEE):
// decimals/symbol/grossBuyAmount are the only real data this needs, passed
// as props instead of a live useBuyTokenContract() handle.
export { default as AffiliateFee } from './AffiliateFee';
// 2026-09-22 — real migration (MERIT_INFO_PANEL). MeritInfoPanelReal, not
// MeritInfoPanel — this package already has its own separate, inert
// MeritInfoPanel.tsx placeholder; see MeritInfoPanelReal.tsx's own header
// comment for why these stay two distinct exports.
export { default as MeritInfoPanelReal } from './MeritInfoPanelReal';
export { default as ReadOnlyMetaDataTable, } from './ReadOnlyMetaDataTable';
export { msTableTw } from './msTableTw';
export { getMeritInfoMetaData, toDisplayString, } from './recordFields';
// 2026-09-22 — opaque-slot migration (TOKEN_ADDRESS_COMPONENT): address/
// symbol/name/blockchainName are plain resolved strings, icon is a slot
// for the real (non-portable) TokenLogo, onSelectClick is the caller's
// real openActiveListPanel wiring.
export { default as TokenAddressComponent } from './TokenAddressComponent';
// 2026-09-22 — MESSAGE_PANEL migration. MessagePanelReal (not
// MessagePanel -- that name is the existing, separate inert placeholder
// above) + its real, portable support pieces. MessageAccountRow/
// MessageTokenRow deliberately stay web-app-local (see
// MessageDetailsSection.tsx's own header comment) -- renderAccountRow/
// renderTokenRow are slots for them.
export { errorPanelDisplayStore } from './errorPanelDisplayStore';
export { MESSAGE_STATUS_STYLES, classifyMessageStatus, MERIT_WRITE_REJECTED_SUFFIX, } from './messageStatusStyles';
export { default as MessageLabelValueRow } from './MessageLabelValueRow';
export { default as MessageDetailsSection } from './MessageDetailsSection';
export { default as MessagePanelReal } from './MessagePanelReal';
// Trade-shaped panels (TRADING_STATION_PANEL, SPONSORSHIP_PANEL, SEND_PANEL)
export { default as TradeAmountRow } from './TradeAmountRow';
// 2026-09-13 — EXCHANGE_TRADING_PAIR, split out of TradingStationPanel.tsx
// to match the real app's own component boundary (its own `<div id=
// "EXCHANGE_TRADING_PAIR">`, a sibling of CONNECT_TRADE_BUTTON/
// AFFILIATE_FEE/FEE_DISCLOSURE inside TRADING_STATION_PANEL, not something
// the outer panel wrapper owns) — see ExchangeTradingPair.tsx's own doc
// comment.
export { default as ExchangeTradingPair } from './ExchangeTradingPair';
export { default as TradingStationPanel } from './TradingStationPanel';
// 2026-09-22 — real, live SWAP_ARROW_BUTTON/CONFIG_SLIPPAGE_PANEL,
// promoted from their web-app wrapper files (see each one's own header
// comment). Distinct from ExchangeTradingPair.tsx's own private, inert
// SwapArrowButton placeholder function.
export { default as BuySellSwapArrowButton } from './BuySellSwapArrowButton';
export { toDecimalString, shiftDecimal, coerceShiftedAmount, } from './BuySellSwapArrowButton';
export { default as ConfigSlippagePanel } from './ConfigSlippagePanel';
// 2026-09-25, on request ("migrate UNISWAP_TRADE_BUTTON") — presentation
// only (styling/disabled/busy/hover states, self-gated on its own
// panel-tree visibility); real execution stays web-app-local. See this
// file's own header comment for the full reasoning.
export { default as UniswapTradeButton } from './UniswapTradeButton';
// 2026-09-25, on request ("do issue 2") — real, portable TokenLogo, every
// dependency confirmed genuinely portable. See its own header comment.
export { default as TokenLogo } from './TokenLogo';
export { SLIPPAGE_MIN_BPS, SLIPPAGE_MAX_BPS, SLIPPAGE_STEP_BPS, } from './ConfigSlippagePanel';
export { default as SponsorshipPanel } from './SponsorshipPanel';
export { default as StakingControllerPanel } from './StakingControllerPanel';
// 2026-09-27 — portable ConfigSponsorshipPanel shell. State machine, slider
// math, layout, and the Agent-header-panel visibility sync live here; the web
// app wrapper injects rate-range bounds + annual-inflation rate from
// ExchangeContext, the info icon (next/image), and the distribution-info /
// close callbacks.
export { default as ConfigSponsorshipPanel } from './ConfigSponsorshipPanel';
export { default as StakingStatusPanelLayoutContainer } from './StakingStatusPanelLayoutContainer';
export { default as SendTabPanel } from './SendTabPanel';
export { default as SendAddressHeaderBar } from './SendAddressHeaderBar';
// List-shaped panels (ASSET_LIST_SELECT_PANEL, SPONSOR_STAKING_LIST,
// ACCOUNT_LIST_REWARDS_PANEL, MANAGE_SPONSORSHIPS_PANEL)
export { default as GenericListPanel } from './GenericListPanel';
export { default as AssetListSelectPanel, shouldShowAddressBar } from './AssetListSelectPanel';
export { default as SponsorStakingListPanel } from './SponsorStakingListPanel';
export { formatTokenAmount, formatTokenAmountCapped } from './SponsorStakingListPanel';
export { sumStakedRaw, sumAgentStakedRaw } from './SponsorStakingListPanel';
export { default as AccountListRewardsPanel } from './AccountListRewardsPanel';
export { default as ManageSponsorshipsPanel } from './ManageSponsorshipsPanel';
export { REWARD_ROLES, REWARD_ROLE_CONFIG, TOTAL_REWARD_CONFIG, DISPLAY_MAX_FRACTION_DIGITS, readRecordValue, formatAccountRecordAmount, addDecimalDisplayAmounts, isZeroDisplayAmount, toRawRewardBigInt, parseServerSecondsValue, getPendingRewardsTotalFromRecord, getRewardResultAmount, getClaimSettlementEntry, getTotalRewardResultRoleAmount, getTotalRewardResultAmount, getAccountRecordPendingReward, } from './rewards/rewardResultParsers';
// 2026-09-14 — MANAGE_PENDING_REWARDS' own portable placeholder, nested
// inside ManageSponsorshipsPanel above rather than a sibling of it (same
// parent/child shape the real registry declares — see
// docs/design/extensionPlan.md's "Fourth slice" entry). Exported
// separately too, in case a future consumer wants it standalone.
export { default as RewardsPendingByAccountTypePanel } from './RewardsPendingByAccountTypePanel';
export { default as RewardRow } from './RewardRow';
// 2026-09-27 — portable per-second accrual ticker hook. Extracts the
// ticker math from the web app's ManageSponsorshipsPanel.tsx into a reusable
// hook that both web app and extension can use. Uses formatAccountRecordAmount
// (already in this package) + native setInterval/Date.now() — no Phase B.2
// hooks needed.
export { useRewardTicker, useRewardTickerMulti } from './rewards/useRewardTicker';
// 2026-09-27, Phase 4 TRADING_STATION_PANEL — first presentation-button
// group. ActionButton is pure presentation; ExchangeButton is the
// presentation shell that renders ActionButton + an injected confirm-popup
// slot (e.g. StakeConfirmPopup). The web app's own state machine
// (useSwapFunctions, useSponsorMode, stores) stays local — see Phase B.2 in
// docs/estimate.txt.
export { default as ActionButton } from './ActionButton';
export { default as ExchangeButton } from './ExchangeButton';
// The shared "TOKEN META | INFO" list shape (2026-09-15) — covers all four
// ACTIVE_LIST_PANEL_MODES screens that share this layout (REMOTE_TOKEN_LIST/
// REMOTE_ACCOUNT_AGENT_LIST/REMOTE_ACCOUNT_RECIPIENT_LIST/REMOTE_ACCOUNT_SEND_LIST
// — see AssetListTable.tsx's own doc comment). NETWORK_LIST and
// LOCAL_ACCOUNT_WALLET_LIST each have their own distinct layout — see
// NetworkListTable.tsx/AccountListCard.tsx further down.
export { default as AssetListRow } from './AssetListRow';
export { default as AssetListTable, ASSET_LIST_ROW_BG_A, ASSET_LIST_ROW_BG_B } from './AssetListTable';
// LOCAL_ACCOUNT_WALLET_LIST's own distinct layout (2026-09-15) — grouped
// Merit Wallet/MetaMask account list + "Add a Wallet/Account" button, see
// AccountListCard.tsx's own doc comment.
export { default as AccountListCard } from './AccountListCard';
// Portable, read-only ACCOUNT_PANEL slice (2026-09-16) — avatar.png +
// info.json fields for one account, opened via WalletAccountHeader's own
// avatar icon. See AccountDetailPanel.tsx's own doc comment for what this
// deliberately is/isn't a port of.
export { default as AccountDetailPanel } from './AccountDetailPanel';
// Portable, read-only token-list counterpart (2026-09-16, "do the same for
// the info.png in the lists") — opened via any token row's own info icon.
export { default as TokenDetailPanel } from './TokenDetailPanel';
// Portable, read-only network-list counterpart (same request) — opened via
// NetworkListRow's own icon, no caller round-trip needed (see that file's
// own doc comment on why).
export { default as NetworkDetailPanel } from './NetworkDetailPanel';
// NETWORK_LIST's own distinct layout (2026-09-15) — the third and last
// ACTIVE_LIST_PANEL_MODES screen, "Network Meta | Auth Source / Status"
// header + Merit/MetaMask per-row auth toggle + "Show Test Nets" footer,
// see NetworkListRow.tsx/NetworkListTable.tsx's own doc comments.
export { default as NetworkListRow } from './NetworkListRow';
export { default as NetworkListTable, NETWORK_LIST_ROW_BG_A, NETWORK_LIST_ROW_BG_B } from './NetworkListTable';
// ASSET_PANELS' 11 children (ACCOUNT_PANEL, AGENT_PANEL, SPONSOR_PANEL,
// RECIPIENT_PANEL, TOKEN_PANEL, TOKEN_BUY_PANEL, TOKEN_SELL_PANEL,
// TOKEN_BUY_SWAP_PANEL, TOKEN_SELL_SWAP_PANEL, TOKEN_SEND_PANEL,
// NETWORK_PANEL) — each real version shows nothing but this one plain
// message box when nothing is selected, the only reachable state here.
export { default as DetailPanelEmptyState } from './DetailPanelEmptyState';
// 2026-09-21, Path A — RESTORED after a brief same-day deletion; see this
// file's own PanelGate comment above for why. The single write
// chokepoint. A direct export, not a hook — meritPanelState.setVisible is
// already a stable, non-reactive class-field reference, so a hook
// wrapper would add nothing. Named `setPanelVisible` here to match the
// app's own existing naming (usePanelTree's setPanelVisible) for anyone
// porting call sites over.
import { meritPanelState } from './panelState';
export const setPanelVisible = meritPanelState.setVisible;
export const isPanelVisible = meritPanelState.isVisible;
// Exported for advanced/debug use (e.g. a future debug-tree equivalent,
// and the real one, Branch.tsx, already a live consumer) — not part of
// the normal read/write surface above.
export { meritPanelState } from './panelState';
