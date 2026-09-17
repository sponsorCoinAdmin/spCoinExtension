"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meritPanelState = exports.isPanelVisible = exports.setPanelVisible = exports.DetailPanelEmptyState = exports.NETWORK_LIST_ROW_BG_B = exports.NETWORK_LIST_ROW_BG_A = exports.NetworkListTable = exports.NetworkListRow = exports.NetworkDetailPanel = exports.TokenDetailPanel = exports.AccountDetailPanel = exports.AccountListCard = exports.ASSET_LIST_ROW_BG_B = exports.ASSET_LIST_ROW_BG_A = exports.AssetListTable = exports.AssetListRow = exports.RewardRow = exports.RewardsPendingByAccountTypePanel = exports.ManageSponsorshipsPanel = exports.AccountListRewardsPanel = exports.SponsorStakingListPanel = exports.AssetListSelectPanel = exports.GenericListPanel = exports.SendTabPanel = exports.SponsorshipPanel = exports.TradingStationPanel = exports.ExchangeTradingPair = exports.TradeAmountRow = exports.ProcessFlowPanel = exports.WalletConfigPanel = exports.MeritInfoPanel = exports.PasswordPanel = exports.MessagePanel = exports.MenuTabHeaderBar = exports.PanelTitle = exports.AgentHeaderPanel = exports.AgentSelectDropDown = exports.NetworkSelectDropDown = exports.WalletAccountHeader = exports.MeritTitleComponent = exports.WalletHeader = exports.ScrollTablePanel = exports.ASSET_SELECT_DISPLAY = exports.AssetSelectDropDown = exports.MeritWallet = exports.MeritPanelGate = exports.usePanelVisible = void 0;
var usePanelVisible_1 = require("./usePanelVisible");
Object.defineProperty(exports, "usePanelVisible", { enumerable: true, get: function () { return usePanelVisible_1.usePanelVisible; } });
var MeritPanelGate_1 = require("./MeritPanelGate");
Object.defineProperty(exports, "MeritPanelGate", { enumerable: true, get: function () { return __importDefault(MeritPanelGate_1).default; } });
// 2026-09-14 — the self-contained wallet, per docs/design/extensionPlan.md's
// "Direction changed" entry: one shared MeritWallet component instead of
// two independently-rebuilt wallets, simplified further on direct request
// so a consumer just renders `<MeritWallet />` — see MeritWallet.tsx's own
// doc comment for the full reasoning.
var MeritWallet_1 = require("./MeritWallet");
Object.defineProperty(exports, "MeritWallet", { enumerable: true, get: function () { return __importDefault(MeritWallet_1).default; } });
// 2026-09-11 — first UI component in the package (previously engine-only,
// per this file's own "keep it simple" header note above). Portability
// pass done first (see AssetSelectDropDown.tsx's own inlined-truncateMiddle
// comment): no @/-aliased imports left, PanelGate is an injected prop
// rather than a hardcoded one, so this has no dependency on any one app's
// ExchangeContext/panel-tree — see extensionPlan.md's panel-tree discussion
// for the full reasoning.
var AssetSelectDropDown_1 = require("./AssetSelectDropDown");
Object.defineProperty(exports, "AssetSelectDropDown", { enumerable: true, get: function () { return __importDefault(AssetSelectDropDown_1).default; } });
Object.defineProperty(exports, "ASSET_SELECT_DISPLAY", { enumerable: true, get: function () { return AssetSelectDropDown_1.ASSET_SELECT_DISPLAY; } });
var ScrollTablePanel_1 = require("./ScrollTablePanel");
Object.defineProperty(exports, "ScrollTablePanel", { enumerable: true, get: function () { return __importDefault(ScrollTablePanel_1).default; } });
// 2026-09-11 — second UI component ("Pages Grey header bar" slice, see
// docs/design/extensionPlan.md). Same portability pass as above: next/image
// swapped for <img>, the hardcoded MERIT_INFO_PANEL click handler replaced
// with an optional onTitleClick prop.
var WalletHeader_1 = require("./WalletHeader");
Object.defineProperty(exports, "WalletHeader", { enumerable: true, get: function () { return __importDefault(WalletHeader_1).default; } });
var MeritTitleComponent_1 = require("./MeritTitleComponent");
Object.defineProperty(exports, "MeritTitleComponent", { enumerable: true, get: function () { return __importDefault(MeritTitleComponent_1).default; } });
// 2026-09-12 — third UI component: a placeholder for WALLET_ACCOUNT_HEADER.
// Unlike the two above, the real app version (PanelSubTitle.tsx) has no
// portable "shape" to copy yet — its content is a real account picker plus
// a live on-chain role-badge fetch, neither of which has anything real to
// show without an actual connected account. This is intentionally inert
// (every prop optional, safe do-nothing defaults) rather than a partial
// port of logic with nothing behind it yet.
var WalletAccountHeader_1 = require("./WalletAccountHeader");
Object.defineProperty(exports, "WalletAccountHeader", { enumerable: true, get: function () { return __importDefault(WalletAccountHeader_1).default; } });
// 2026-09-12 — fourth UI component: a placeholder for the network pill
// WalletHeader's own leftSlot carries in the real app (WALLET_NETWORK_HEADER
// IS WalletHeader + this pill, not a separate row — see
// components/views/MeritWalletComponent.tsx). Same "inert, no real data
// source yet" reasoning as WalletAccountHeader.
var NetworkSelectDropDown_1 = require("./NetworkSelectDropDown");
Object.defineProperty(exports, "NetworkSelectDropDown", { enumerable: true, get: function () { return __importDefault(NetworkSelectDropDown_1).default; } });
// 2026-09-12 — fifth/sixth UI components: placeholders for
// AGENT_SELECT_DROP_DOWN and its parent AGENT_HEADER_PANEL. Same "inert,
// no real data source yet" reasoning as WalletAccountHeader/
// NetworkSelectDropDown above — see each file's own doc comment.
var AgentSelectDropDown_1 = require("./AgentSelectDropDown");
Object.defineProperty(exports, "AgentSelectDropDown", { enumerable: true, get: function () { return __importDefault(AgentSelectDropDown_1).default; } });
var AgentHeaderPanel_1 = require("./AgentHeaderPanel");
Object.defineProperty(exports, "AgentHeaderPanel", { enumerable: true, get: function () { return __importDefault(AgentHeaderPanel_1).default; } });
// 2026-09-12 — seventh/eighth UI components: placeholders for PANEL_TITLE
// (ActiveWalletPanelTitle/PopupHeader's back/title/menu bar) and
// MENU_TAB_HEADER_BAR (AccountPanelTabBar's Swap/Send/Sponsor/Rewards/
// Config tab strip — the panel itself is just a visibility flag with no
// children of its own, see panelRegistry.ts; this ports its actual visual
// content). Same "inert, no real panel-tree/wallet-lock data source yet"
// reasoning as every component above — see each file's own doc comment.
var PanelTitle_1 = require("./PanelTitle");
Object.defineProperty(exports, "PanelTitle", { enumerable: true, get: function () { return __importDefault(PanelTitle_1).default; } });
var MenuTabHeaderBar_1 = require("./MenuTabHeaderBar");
Object.defineProperty(exports, "MenuTabHeaderBar", { enumerable: true, get: function () { return __importDefault(MenuTabHeaderBar_1).default; } });
// 2026-09-12 — remaining RADIO_PANELS placeholders (all 24, per explicit
// instruction: "implement the placeholders, not the logic"). Same "inert,
// no real panel-tree/wallet/chain data source yet" reasoning as every
// component above — see each file's own doc comment. Several real panel
// ids share one component where the real app itself shares a shape
// (DetailPanelEmptyState covers all 11 ASSET_PANELS children; the list-
// shaped panels share GenericListPanel) — noted in each wrapper's own
// comment, not a shortcut taken silently.
var MessagePanel_1 = require("./MessagePanel");
Object.defineProperty(exports, "MessagePanel", { enumerable: true, get: function () { return __importDefault(MessagePanel_1).default; } });
var PasswordPanel_1 = require("./PasswordPanel");
Object.defineProperty(exports, "PasswordPanel", { enumerable: true, get: function () { return __importDefault(PasswordPanel_1).default; } });
var MeritInfoPanel_1 = require("./MeritInfoPanel");
Object.defineProperty(exports, "MeritInfoPanel", { enumerable: true, get: function () { return __importDefault(MeritInfoPanel_1).default; } });
var WalletConfigPanel_1 = require("./WalletConfigPanel");
Object.defineProperty(exports, "WalletConfigPanel", { enumerable: true, get: function () { return __importDefault(WalletConfigPanel_1).default; } });
var ProcessFlowPanel_1 = require("./ProcessFlowPanel");
Object.defineProperty(exports, "ProcessFlowPanel", { enumerable: true, get: function () { return __importDefault(ProcessFlowPanel_1).default; } });
// Trade-shaped panels (TRADING_STATION_PANEL, SPONSORSHIP_PANEL, SEND_PANEL)
var TradeAmountRow_1 = require("./TradeAmountRow");
Object.defineProperty(exports, "TradeAmountRow", { enumerable: true, get: function () { return __importDefault(TradeAmountRow_1).default; } });
// 2026-09-13 — EXCHANGE_TRADING_PAIR, split out of TradingStationPanel.tsx
// to match the real app's own component boundary (its own `<div id=
// "EXCHANGE_TRADING_PAIR">`, a sibling of CONNECT_TRADE_BUTTON/
// AFFILIATE_FEE/FEE_DISCLOSURE inside TRADING_STATION_PANEL, not something
// the outer panel wrapper owns) — see ExchangeTradingPair.tsx's own doc
// comment.
var ExchangeTradingPair_1 = require("./ExchangeTradingPair");
Object.defineProperty(exports, "ExchangeTradingPair", { enumerable: true, get: function () { return __importDefault(ExchangeTradingPair_1).default; } });
var TradingStationPanel_1 = require("./TradingStationPanel");
Object.defineProperty(exports, "TradingStationPanel", { enumerable: true, get: function () { return __importDefault(TradingStationPanel_1).default; } });
var SponsorshipPanel_1 = require("./SponsorshipPanel");
Object.defineProperty(exports, "SponsorshipPanel", { enumerable: true, get: function () { return __importDefault(SponsorshipPanel_1).default; } });
var SendTabPanel_1 = require("./SendTabPanel");
Object.defineProperty(exports, "SendTabPanel", { enumerable: true, get: function () { return __importDefault(SendTabPanel_1).default; } });
// List-shaped panels (ASSET_LIST_SELECT_PANEL, SPONSOR_STAKING_LIST,
// ACCOUNT_LIST_REWARDS_PANEL, MANAGE_SPONSORSHIPS_PANEL)
var GenericListPanel_1 = require("./GenericListPanel");
Object.defineProperty(exports, "GenericListPanel", { enumerable: true, get: function () { return __importDefault(GenericListPanel_1).default; } });
var AssetListSelectPanel_1 = require("./AssetListSelectPanel");
Object.defineProperty(exports, "AssetListSelectPanel", { enumerable: true, get: function () { return __importDefault(AssetListSelectPanel_1).default; } });
var SponsorStakingListPanel_1 = require("./SponsorStakingListPanel");
Object.defineProperty(exports, "SponsorStakingListPanel", { enumerable: true, get: function () { return __importDefault(SponsorStakingListPanel_1).default; } });
var AccountListRewardsPanel_1 = require("./AccountListRewardsPanel");
Object.defineProperty(exports, "AccountListRewardsPanel", { enumerable: true, get: function () { return __importDefault(AccountListRewardsPanel_1).default; } });
var ManageSponsorshipsPanel_1 = require("./ManageSponsorshipsPanel");
Object.defineProperty(exports, "ManageSponsorshipsPanel", { enumerable: true, get: function () { return __importDefault(ManageSponsorshipsPanel_1).default; } });
// 2026-09-14 — MANAGE_PENDING_REWARDS' own portable placeholder, nested
// inside ManageSponsorshipsPanel above rather than a sibling of it (same
// parent/child shape the real registry declares — see
// docs/design/extensionPlan.md's "Fourth slice" entry). Exported
// separately too, in case a future consumer wants it standalone.
var RewardsPendingByAccountTypePanel_1 = require("./RewardsPendingByAccountTypePanel");
Object.defineProperty(exports, "RewardsPendingByAccountTypePanel", { enumerable: true, get: function () { return __importDefault(RewardsPendingByAccountTypePanel_1).default; } });
var RewardRow_1 = require("./RewardRow");
Object.defineProperty(exports, "RewardRow", { enumerable: true, get: function () { return __importDefault(RewardRow_1).default; } });
// The shared "TOKEN META | INFO" list shape (2026-09-15) — covers all four
// ACTIVE_LIST_PANEL_MODES screens that share this layout (REMOTE_TOKEN_LIST/
// REMOTE_ACCOUNT_AGENT_LIST/REMOTE_ACCOUNT_RECIPIENT_LIST/REMOTE_ACCOUNT_LIST
// — see AssetListTable.tsx's own doc comment). NETWORK_LIST and
// LOCAL_ACCOUNT_WALLET_LIST each have their own distinct layout — see
// NetworkListTable.tsx/AccountListCard.tsx further down.
var AssetListRow_1 = require("./AssetListRow");
Object.defineProperty(exports, "AssetListRow", { enumerable: true, get: function () { return __importDefault(AssetListRow_1).default; } });
var AssetListTable_1 = require("./AssetListTable");
Object.defineProperty(exports, "AssetListTable", { enumerable: true, get: function () { return __importDefault(AssetListTable_1).default; } });
Object.defineProperty(exports, "ASSET_LIST_ROW_BG_A", { enumerable: true, get: function () { return AssetListTable_1.ASSET_LIST_ROW_BG_A; } });
Object.defineProperty(exports, "ASSET_LIST_ROW_BG_B", { enumerable: true, get: function () { return AssetListTable_1.ASSET_LIST_ROW_BG_B; } });
// LOCAL_ACCOUNT_WALLET_LIST's own distinct layout (2026-09-15) — grouped
// Merit Wallet/MetaMask account list + "Add a Wallet/Account" button, see
// AccountListCard.tsx's own doc comment.
var AccountListCard_1 = require("./AccountListCard");
Object.defineProperty(exports, "AccountListCard", { enumerable: true, get: function () { return __importDefault(AccountListCard_1).default; } });
// Portable, read-only ACCOUNT_PANEL slice (2026-09-16) — avatar.png +
// info.json fields for one account, opened via WalletAccountHeader's own
// avatar icon. See AccountDetailPanel.tsx's own doc comment for what this
// deliberately is/isn't a port of.
var AccountDetailPanel_1 = require("./AccountDetailPanel");
Object.defineProperty(exports, "AccountDetailPanel", { enumerable: true, get: function () { return __importDefault(AccountDetailPanel_1).default; } });
// Portable, read-only token-list counterpart (2026-09-16, "do the same for
// the info.png in the lists") — opened via any token row's own info icon.
var TokenDetailPanel_1 = require("./TokenDetailPanel");
Object.defineProperty(exports, "TokenDetailPanel", { enumerable: true, get: function () { return __importDefault(TokenDetailPanel_1).default; } });
// Portable, read-only network-list counterpart (same request) — opened via
// NetworkListRow's own icon, no caller round-trip needed (see that file's
// own doc comment on why).
var NetworkDetailPanel_1 = require("./NetworkDetailPanel");
Object.defineProperty(exports, "NetworkDetailPanel", { enumerable: true, get: function () { return __importDefault(NetworkDetailPanel_1).default; } });
// NETWORK_LIST's own distinct layout (2026-09-15) — the third and last
// ACTIVE_LIST_PANEL_MODES screen, "Network Meta | Auth Source / Status"
// header + Merit/MetaMask per-row auth toggle + "Show Test Nets" footer,
// see NetworkListRow.tsx/NetworkListTable.tsx's own doc comments.
var NetworkListRow_1 = require("./NetworkListRow");
Object.defineProperty(exports, "NetworkListRow", { enumerable: true, get: function () { return __importDefault(NetworkListRow_1).default; } });
var NetworkListTable_1 = require("./NetworkListTable");
Object.defineProperty(exports, "NetworkListTable", { enumerable: true, get: function () { return __importDefault(NetworkListTable_1).default; } });
Object.defineProperty(exports, "NETWORK_LIST_ROW_BG_A", { enumerable: true, get: function () { return NetworkListTable_1.NETWORK_LIST_ROW_BG_A; } });
Object.defineProperty(exports, "NETWORK_LIST_ROW_BG_B", { enumerable: true, get: function () { return NetworkListTable_1.NETWORK_LIST_ROW_BG_B; } });
// ASSET_PANELS' 11 children (ACCOUNT_PANEL, AGENT_PANEL, SPONSOR_PANEL,
// RECIPIENT_PANEL, TOKEN_PANEL, TOKEN_BUY_PANEL, TOKEN_SELL_PANEL,
// TOKEN_BUY_SWAP_PANEL, TOKEN_SELL_SWAP_PANEL, TOKEN_SEND_PANEL,
// NETWORK_PANEL) — each real version shows nothing but this one plain
// message box when nothing is selected, the only reachable state here.
var DetailPanelEmptyState_1 = require("./DetailPanelEmptyState");
Object.defineProperty(exports, "DetailPanelEmptyState", { enumerable: true, get: function () { return __importDefault(DetailPanelEmptyState_1).default; } });
// The single write chokepoint. A direct export, not a hook — meritPanelState
// .setVisible is already a stable, non-reactive class-field reference, so a
// hook wrapper would add nothing. Named `setPanelVisible` here to match the
// app's own existing naming (usePanelTree's setPanelVisible) for anyone
// porting call sites over.
const panelState_1 = require("./panelState");
exports.setPanelVisible = panelState_1.meritPanelState.setVisible;
exports.isPanelVisible = panelState_1.meritPanelState.isVisible;
// Exported for advanced/debug use (e.g. a future debug-tree equivalent) —
// not part of the normal read/write surface above.
var panelState_2 = require("./panelState");
Object.defineProperty(exports, "meritPanelState", { enumerable: true, get: function () { return panelState_2.meritPanelState; } });
