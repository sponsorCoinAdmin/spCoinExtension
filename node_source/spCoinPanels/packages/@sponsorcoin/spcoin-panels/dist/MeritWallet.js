// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MeritWallet.tsx
// Self-contained Merit Wallet component — 2026-09-14, per docs/design/
// extensionPlan.md's "Direction changed" entry (one shared `MeritWallet`
// component instead of two independently-rebuilt wallets), simplified on
// direct request: "the extension should embed just MeritWallet.tsx" — not
// a bare shell requiring the caller to assemble header/account-row/tabs/
// panel-bodies itself via 3 injected slots (that earlier design, tried
// first, put real composition work back on every consumer).
//
// This component now composes its own header (WalletHeader +
// NetworkSelectDropDown), account row (WalletAccountHeader), tab title
// (PanelTitle), tab strip + active panel body (MenuTabHeaderBar +
// TradingStationPanel/SendTabPanel/SponsorshipPanel/
// ManageSponsorshipsPanel/WalletConfigPanel) internally, using this same
// package's own portable, inert placeholder versions of each — the exact
// composition sidepanel.ts used to hand-assemble itself. A consumer now
// just renders `<MeritWallet onClose={...} />` and gets the whole nested
// layout for free.
//
// No @/-aliased imports, no Tailwind (a component library shouldn't
// require every consumer to run a Tailwind pipeline — see
// WalletHeader.tsx's own header comment), so this has no dependency on
// any one app's ExchangeContext/panel-tree/styling pipeline. Every piece
// composed here is already independently portable — see each file's own
// doc comment (WalletHeader.tsx, WalletAccountHeader.tsx, PanelTitle.tsx,
// MenuTabHeaderBar.tsx, and the 5 tab-panel files).
//
// `SP_COIN_DISPLAY.MERIT_WALLET` itself is deliberately NOT gated inside
// this component — extensionPlan.md's "Third slice" entry ruled that
// migration out (PasswordGateOrchestrator.tsx depends on it app-wide;
// migrating it wrong risks the password gate failing to force closed).
// Whether/when to render this component at all stays the host's call.
'use client';
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MeritWallet;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const panels_1 = require("@sponsorcoin/spcoin-common/panels");
const MeritPanelGate_1 = __importDefault(require("./MeritPanelGate"));
const panelState_1 = require("./panelState");
const packageBuildTag_1 = require("./packageBuildTag");
const WalletHeader_1 = __importDefault(require("./WalletHeader"));
const NetworkSelectDropDown_1 = __importDefault(require("./NetworkSelectDropDown"));
const WalletAccountHeader_1 = __importDefault(require("./WalletAccountHeader"));
const PanelTitle_1 = __importDefault(require("./PanelTitle"));
const MenuTabHeaderBar_1 = __importDefault(require("./MenuTabHeaderBar"));
const TradingStationPanel_1 = __importDefault(require("./TradingStationPanel"));
const SendTabPanel_1 = __importDefault(require("./SendTabPanel"));
const SponsorshipPanel_1 = __importDefault(require("./SponsorshipPanel"));
const ManageSponsorshipsPanel_1 = __importDefault(require("./ManageSponsorshipsPanel"));
const WalletConfigPanel_1 = __importDefault(require("./WalletConfigPanel"));
const AssetListTable_1 = __importDefault(require("./AssetListTable"));
const AccountListCard_1 = __importDefault(require("./AccountListCard"));
const AccountDetailPanel_1 = __importDefault(require("./AccountDetailPanel"));
const TokenDetailPanel_1 = __importDefault(require("./TokenDetailPanel"));
const NetworkDetailPanel_1 = __importDefault(require("./NetworkDetailPanel"));
const NetworkListTable_1 = __importDefault(require("./NetworkListTable"));
// Static sample rows — this package has no real feed to query (see
// AssetListTable.tsx's own "placeholder, not logic" doc comment); a
// representative, clearly-fake set is enough to prove the shared list
// shape renders and scrolls correctly, same "representative state by
// default" treatment ManageSponsorshipsPanel/RewardRow already use.
const SAMPLE_TOKEN_ROWS = [
    { id: '0xeeee', symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
    { id: '0xspcoinv0', symbol: 'SPCOIN_V0', name: 'Sponsor Coin V0', address: '0xf3405e01f11d9d7841b4dc61f13a9834c88a5e1b' },
    { id: '0xweth', symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
];
// Sample groups for AccountListCard.tsx (LOCAL_ACCOUNT_WALLET_LIST) — same
// "Doggie | Hot Dog" example already used elsewhere in this file's own
// sample data, now the group's active row (isActive: true).
const SAMPLE_ACCOUNT_GROUPS = [
    {
        id: 'hardhat',
        label: 'Merit Wallet',
        isActiveSource: true,
        accounts: [
            { id: '0xf3', symbol: 'Doggie', name: 'Hot Dog', address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', isActive: true },
            { id: '0x709', symbol: 'HH_BASE_1', name: 'HH 1', address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8' },
            { id: '0x3c4', symbol: 'HH_BASE_2', name: 'HH 2', address: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc' },
        ],
    },
    {
        id: 'metamask',
        label: 'MetaMask',
        isActiveSource: false,
        connectLabel: 'Connect',
        accounts: [],
    },
];
// Sample rows for NetworkListTable.tsx (NETWORK_LIST) — one active mainnet
// (Ethereum) plus two more, matching networks.tsx's own "active pinned
// first" convention. Real per-chain auth-source state (merit/metamask)
// lives in this component's own useState below, keyed by row id, exactly
// how networks.tsx keys NetworkAuthToggle per chainId.
const SAMPLE_NETWORK_ROWS = [
    { id: 'eth-mainnet', symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', isActive: true },
    { id: 'polygon', symbol: 'MATIC', name: 'Polygon', address: '0x00000000000000000000000000000000001010' },
    { id: 'hardhat', symbol: 'HH', name: 'Hardhat', address: '0x0000000000000000000000000000000000539b' },
];
function MeritWallet({ docked = false, fullWidth = false, onClose, titleBadgeSrc, onRefresh, refreshing, closeIconSrc, infoIconSrc, initialActiveTab, onActiveTabChange, initialMenuOpen, onMenuOpenChange, initialOpenTarget, onOpenTargetChange, networkRows, accountGroups, tokenRows, recipientRows, onAccountRowSelect, onNetworkRowSelect, onAccountIconClick, accountDetail, onTokenIconClick, tokenDetail, onNetworkIconClick, }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2;
    const [menuOpen, setMenuOpen] = (0, react_1.useState)(initialMenuOpen !== null && initialMenuOpen !== void 0 ? initialMenuOpen : true);
    const [activeTab, setActiveTab] = (0, react_1.useState)(initialActiveTab !== null && initialActiveTab !== void 0 ? initialActiveTab : 'SWAP');
    const [openTarget, setOpenTarget] = (0, react_1.useState)(initialOpenTarget !== null && initialOpenTarget !== void 0 ? initialOpenTarget : 'prod');
    const [activeListMode, setActiveListMode] = (0, react_1.useState)(null);
    const [selections, setSelections] = (0, react_1.useState)({});
    // Separate from activeListMode — this is a DETAIL view (one account,
    // read-only), not a list to pick from, and can be reached from a
    // different trigger (the avatar icon, not the row/chevron). Null when
    // closed; a real address string while showing that account's details.
    const [accountDetailAddress, setAccountDetailAddress] = (0, react_1.useState)(null);
    // Same idea, for the token-list's own info icon (Select a Token).
    const [tokenDetailAddress, setTokenDetailAddress] = (0, react_1.useState)(null);
    // Same idea, for the network-list's own icon (Select Network) — see
    // onNetworkIconClick's own doc comment for why this one needs no
    // separate "detail" data prop from the caller.
    const [networkDetailId, setNetworkDetailId] = (0, react_1.useState)(null);
    // Per-row Merit/MetaMask auth-source selection for NETWORK_LIST — keyed
    // by row id, same "own live state, not a real per-chain RPC setting yet"
    // treatment as everything else in this file (see networks.tsx's own
    // NetworkAuthToggle for the real, per-chainId-persisted version this
    // stands in for). Defaults every row to 'merit', matching that hook's
    // own default when nothing's been set for a chain yet.
    const [networkAuthSources, setNetworkAuthSources] = (0, react_1.useState)({});
    const [showTestNets, setShowTestNets] = (0, react_1.useState)(false);
    // Switching tabs while a list overlay is open would otherwise leave it
    // showing on top of the NEW tab's body (e.g. open "Select a Token" from
    // Swap, click Send, still see the token list) — closing it here matches
    // the real app's own ActiveListPanel reset-on-parent-close behavior.
    const handleTabClick = (tab) => {
        setActiveTab(tab);
        setActiveListMode(null);
        setAccountDetailAddress(null);
        setTokenDetailAddress(null);
        setNetworkDetailId(null);
        onActiveTabChange === null || onActiveTabChange === void 0 ? void 0 : onActiveTabChange(tab);
    };
    const handleOpenTargetChange = (target) => {
        setOpenTarget(target);
        onOpenTargetChange === null || onOpenTargetChange === void 0 ? void 0 : onOpenTargetChange(target);
    };
    const handleMenuClick = () => {
        setMenuOpen((prev) => {
            const next = !prev;
            onMenuOpenChange === null || onMenuOpenChange === void 0 ? void 0 : onMenuOpenChange(next);
            return next;
        });
    };
    // WALLET_NETWORK_HEADER seed — this engine starts every panel at `false`
    // until something calls setVisible (see extensionPlan.md's "Third
    // slice" entry); since this component now owns that gate internally
    // (the MeritPanelGate below), it has to seed it itself on mount rather
    // than relying on the caller to remember to, the way sidepanel.ts used
    // to before this component became self-contained.
    //
    // 2026-09-14 — MERIT_REWARDS_SUMMARY/MERIT_REWARDS_PENDING seeded here
    // too, same reasoning: both new, genuinely Merit-only panel ids
    // (panelState.ts's own MeritOnlyPanelId — see docs/design/
    // extensionPlan.md's "Fourth slice" entry) start unseen like every
    // other id in this engine, and with no real click-driven "open" call
    // site for either yet, an unseeded pair renders as permanently hidden,
    // not open. Seeded true so the Rewards tab's table shape shows fully
    // expanded by default, matching every other placeholder's own
    // representative-state-by-default treatment.
    (0, react_1.useEffect)(() => {
        panelState_1.meritPanelState.setVisible(panels_1.SP_COIN_DISPLAY.WALLET_NETWORK_HEADER, true);
        panelState_1.meritPanelState.setVisible('MERIT_REWARDS_SUMMARY', true);
        panelState_1.meritPanelState.setVisible('MERIT_REWARDS_PENDING', true);
    }, []);
    // 2026-09-15 — when a list overlay is open (see ActiveListMode's own doc
    // comment above), it replaces the active tab's own body entirely rather
    // than stacking on top of it, matching the real app's ActiveListPanel
    // (an overlay that fully owns the panel body while open, not a layered
    // popover). onSelect closes it the same way a real row pick would.
    const closeListOverlay = () => setActiveListMode(null);
    // 2026-09-16 — the actual "commit this pick" step (see PickableSlot's
    // own doc comment above for the full report/reasoning). Reads
    // activeListMode BEFORE closing the overlay — closeListOverlay only
    // schedules the state update, it doesn't mutate this render's own
    // `activeListMode` binding, so capturing it first (implicitly, by
    // reading it in this same synchronous call) is safe and correct.
    const commitSelection = (row) => {
        const slot = activeListMode;
        closeListOverlay();
        if (!slot)
            return;
        setSelections((prev) => ({
            ...prev,
            [slot]: { symbol: row.symbol, name: row.name, address: row.address, iconSrc: row.iconSrc },
        }));
    };
    const iconFromSrc = (src) => src
        ? react_1.default.createElement('img', {
            src,
            alt: '',
            style: { width: '100%', height: '100%', objectFit: 'contain' },
        })
        : undefined;
    const tabBody = activeTab === 'SWAP'
        ? react_1.default.createElement(TradingStationPanel_1.default, {
            onSellTokenClick: () => setActiveListMode('sellToken'),
            onBuyTokenClick: () => setActiveListMode('buyToken'),
            sellSymbol: (_a = selections.sellToken) === null || _a === void 0 ? void 0 : _a.symbol,
            sellAddress: (_b = selections.sellToken) === null || _b === void 0 ? void 0 : _b.address,
            sellIcon: iconFromSrc((_c = selections.sellToken) === null || _c === void 0 ? void 0 : _c.iconSrc),
            buySymbol: (_d = selections.buyToken) === null || _d === void 0 ? void 0 : _d.symbol,
            buyAddress: (_e = selections.buyToken) === null || _e === void 0 ? void 0 : _e.address,
            buyIcon: iconFromSrc((_f = selections.buyToken) === null || _f === void 0 ? void 0 : _f.iconSrc),
        })
        : activeTab === 'SEND'
            ? react_1.default.createElement(SendTabPanel_1.default, {
                onSendTokenClick: () => setActiveListMode('sendToken'),
                onRecipientClick: () => setActiveListMode('sendRecipient'),
                sendTokenSymbol: (_g = selections.sendToken) === null || _g === void 0 ? void 0 : _g.symbol,
                sendTokenAddress: (_h = selections.sendToken) === null || _h === void 0 ? void 0 : _h.address,
                sendTokenIcon: iconFromSrc((_j = selections.sendToken) === null || _j === void 0 ? void 0 : _j.iconSrc),
                recipientSymbol: (_k = selections.sendRecipient) === null || _k === void 0 ? void 0 : _k.symbol,
                recipientAddress: (_l = selections.sendRecipient) === null || _l === void 0 ? void 0 : _l.address,
                recipientIcon: iconFromSrc((_m = selections.sendRecipient) === null || _m === void 0 ? void 0 : _m.iconSrc),
            })
            : activeTab === 'SPONSOR'
                ? react_1.default.createElement(SponsorshipPanel_1.default, {
                    onPayTokenClick: () => setActiveListMode('sponsorPayToken'),
                    onRecipientClick: () => setActiveListMode('sponsorRecipient'),
                    // "You are Sponsoring <name>" is a single descriptive line,
                    // not a compact pill — "SYMBOL: Name" matches this
                    // component's own placeholder format (e.g. "FREE: Born Free
                    // USA"), not just the bare symbol a trade pill would show.
                    recipientName: ((_o = selections.sponsorRecipient) === null || _o === void 0 ? void 0 : _o.symbol) && ((_p = selections.sponsorRecipient) === null || _p === void 0 ? void 0 : _p.name)
                        ? `${selections.sponsorRecipient.symbol}: ${selections.sponsorRecipient.name}`
                        : (_r = (_q = selections.sponsorRecipient) === null || _q === void 0 ? void 0 : _q.name) !== null && _r !== void 0 ? _r : (_s = selections.sponsorRecipient) === null || _s === void 0 ? void 0 : _s.symbol,
                    payTokenSymbol: (_t = selections.sponsorPayToken) === null || _t === void 0 ? void 0 : _t.symbol,
                    payTokenAddress: (_u = selections.sponsorPayToken) === null || _u === void 0 ? void 0 : _u.address,
                    payTokenIcon: iconFromSrc((_v = selections.sponsorPayToken) === null || _v === void 0 ? void 0 : _v.iconSrc),
                    // 2026-09-16, on live report ("recipientSelectDropDown does
                    // not work as nothing is returned... New Recipient Staked
                    // spCoins") — this pill's own onTokenPillClick is already
                    // wired to the SAME onRecipientClick as "You are Sponsoring"
                    // above (see that prop's own doc comment, corrected earlier
                    // the same day), but its DISPLAY was never fed the result —
                    // recipientName got selections.sponsorRecipient, this pill's
                    // own stakedToken* props didn't. Same picked recipient, same
                    // source, just the compact-pill format instead of the
                    // descriptive-line one.
                    stakedTokenSymbol: (_w = selections.sponsorRecipient) === null || _w === void 0 ? void 0 : _w.symbol,
                    stakedTokenAddress: (_x = selections.sponsorRecipient) === null || _x === void 0 ? void 0 : _x.address,
                    stakedTokenIcon: iconFromSrc((_y = selections.sponsorRecipient) === null || _y === void 0 ? void 0 : _y.iconSrc),
                    // 2026-09-16, on correction ("that was not where the account
                    // panel should be opened... it should have been opened...
                    // in 'New Recipient Staked spCoins'... when the avatar.png
                    // was clicked") — reverted the earlier (wrong) attempt that
                    // wired this onto the LIST rows you pick FROM; the real ask
                    // is this TRIGGER pill's own icon, for whichever recipient
                    // is already picked — same setAccountDetailAddress/
                    // onAccountIconClick mechanism as every other detail-open
                    // callback here.
                    onStakedRecipientIconClick: ((_z = selections.sponsorRecipient) === null || _z === void 0 ? void 0 : _z.address)
                        ? () => {
                            setAccountDetailAddress(selections.sponsorRecipient.address);
                            onAccountIconClick === null || onAccountIconClick === void 0 ? void 0 : onAccountIconClick(selections.sponsorRecipient.address);
                        }
                        : undefined,
                })
                : activeTab === 'REWARDS'
                    ? react_1.default.createElement(ManageSponsorshipsPanel_1.default, {})
                    : react_1.default.createElement(WalletConfigPanel_1.default, { openTarget, onOpenTargetChange: handleOpenTargetChange });
    // Real data (networkRows/accountGroups) vs. this component's own
    // placeholder samples — see MeritWalletProps' own doc comment on why this
    // component never fetches either itself.
    //
    // 2026-09-16, on request ("check the NetworkList in the NPM lib as that
    // works") — resolves each account's iconSrc (a real, cached avatar data
    // URL a consumer like spCoinExtension fetches via
    // @sponsorcoin/spcoin-feeds/accounts' avatarURL) into an actual <img>
    // exactly once here, same conversion the network list overlay below
    // already does for row.iconSrc — so both the account-list overlay's own
    // rows AND activeAccountEntry (which WalletAccountHeader's `icon` prop
    // reads below) get a real avatar without duplicating this conversion in
    // two places. `icon` wins if a caller already supplied one directly.
    const effectiveAccountGroups = (accountGroups !== null && accountGroups !== void 0 ? accountGroups : SAMPLE_ACCOUNT_GROUPS).map((group) => ({
        ...group,
        accounts: group.accounts.map((account) => {
            var _a;
            return ({
                ...account,
                icon: (_a = account.icon) !== null && _a !== void 0 ? _a : (account.iconSrc
                    ? react_1.default.createElement('img', {
                        src: account.iconSrc,
                        alt: '',
                        style: { width: '100%', height: '100%', objectFit: 'contain' },
                    })
                    : undefined),
            });
        }),
    }));
    const networkRowsSource = networkRows !== null && networkRows !== void 0 ? networkRows : SAMPLE_NETWORK_ROWS;
    // The sample fallback's own testnet marker was always just the 'hardhat'
    // id (never a real isTestnet field) — preserved exactly for that path;
    // real networkRows use the real isTestnet flag instead.
    const isRowTestnet = (row) => networkRows ? Boolean(row.isTestnet) : row.id === 'hardhat';
    const visibleNetworkRows = showTestNets
        ? networkRowsSource
        : networkRowsSource.filter((row) => !isRowTestnet(row));
    // Drives the header's compact network pill and account row — same
    // isActive flag the list overlays already use, just read once more here
    // rather than duplicated as separate props.
    const activeNetworkRow = networkRowsSource.find((row) => row.isActive);
    const flatAccountRows = effectiveAccountGroups.flatMap((group) => group.accounts);
    const activeAccountEntry = flatAccountRows.find((account) => account.isActive);
    const effectiveTokenRows = tokenRows !== null && tokenRows !== void 0 ? tokenRows : SAMPLE_TOKEN_ROWS;
    const listOverlay = activeListMode === 'sellToken' ||
        activeListMode === 'buyToken' ||
        activeListMode === 'sendToken' ||
        activeListMode === 'sponsorPayToken'
        ? react_1.default.createElement(AssetListTable_1.default, {
            rows: effectiveTokenRows.map((row) => ({
                ...row,
                onSelect: () => commitSelection(row),
                infoIconSrc,
                onInfoClick: row.address
                    ? () => {
                        setTokenDetailAddress(row.address);
                        onTokenIconClick === null || onTokenIconClick === void 0 ? void 0 : onTokenIconClick(row.address);
                    }
                    : undefined,
            })),
            metaLabel: 'Token Meta',
        })
        : activeListMode === 'sendRecipient' || activeListMode === 'sponsorRecipient'
            ? react_1.default.createElement(AssetListTable_1.default, {
                // Prefers the caller's own real recipient directory
                // (recipientRows — see that prop's own doc comment) once
                // supplied; falls back to the wallet's own accounts
                // (flatAccountRows) only for a consumer with no real
                // recipient feed of its own yet, same "placeholder until a
                // real feed exists" treatment every other fallback in this
                // file already has.
                rows: (recipientRows !== null && recipientRows !== void 0 ? recipientRows : flatAccountRows).map((row) => ({
                    ...row,
                    onSelect: () => commitSelection(row),
                    infoIconSrc,
                    onInfoClick: row.address
                        ? () => {
                            setAccountDetailAddress(row.address);
                            onAccountIconClick === null || onAccountIconClick === void 0 ? void 0 : onAccountIconClick(row.address);
                        }
                        : undefined,
                })),
                metaLabel: 'Account Meta',
            })
            : activeListMode === 'account'
                ? react_1.default.createElement(AccountListCard_1.default, {
                    groups: effectiveAccountGroups.map((group) => ({
                        ...group,
                        accounts: group.accounts.map((account) => ({
                            ...account,
                            onSelect: () => {
                                closeListOverlay();
                                onAccountRowSelect === null || onAccountRowSelect === void 0 ? void 0 : onAccountRowSelect(account.id);
                            },
                            onInfoClick: account.address
                                ? () => {
                                    setAccountDetailAddress(account.address);
                                    onAccountIconClick === null || onAccountIconClick === void 0 ? void 0 : onAccountIconClick(account.address);
                                }
                                : undefined,
                        })),
                    })),
                    infoIconSrc,
                })
                : activeListMode === 'network'
                    ? (console.log('MeritWallet visibleNetworkRows at render:', visibleNetworkRows.map((r) => ({ id: r.id, name: r.name, hasIconSrc: !!r.iconSrc }))),
                        react_1.default.createElement(NetworkListTable_1.default, {
                            rows: visibleNetworkRows.map((row) => {
                                var _a, _b;
                                return ({
                                    ...row,
                                    // NetworkListRow's own AssetSelectDropDown gates its whole
                                    // symbol/name display on `hasEntity={!!address}` (a
                                    // TokenListRow/AccountListRow-ism this row shape
                                    // inherited). Corrected 2026-09-16: this used to fabricate
                                    // a fake native-currency placeholder address to satisfy
                                    // that gate — wrong, per the real app's own
                                    // NetworkSelectDropDown.tsx (`address={isRow ?
                                    // \`NetworkId : ${numericCurrentId}\` : triggerLabel}`),
                                    // which feeds a literal "NetworkId : $id" label into this
                                    // exact slot instead of a real/fake address. Matches that
                                    // exactly now — real per-chain data, not a fabricated
                                    // stand-in.
                                    address: `NetworkId : ${row.id}`,
                                    icon: row.iconSrc
                                        ? react_1.default.createElement('img', {
                                            src: row.iconSrc,
                                            alt: '',
                                            style: { width: '100%', height: '100%', objectFit: 'contain' },
                                        })
                                        : undefined,
                                    onSelect: () => {
                                        closeListOverlay();
                                        onNetworkRowSelect === null || onNetworkRowSelect === void 0 ? void 0 : onNetworkRowSelect(row.id);
                                    },
                                    onIconClick: () => {
                                        setNetworkDetailId(row.id);
                                        onNetworkIconClick === null || onNetworkIconClick === void 0 ? void 0 : onNetworkIconClick(row.id);
                                    },
                                    authSource: (_b = (_a = networkAuthSources[row.id]) !== null && _a !== void 0 ? _a : row.defaultAuthSource) !== null && _b !== void 0 ? _b : 'merit',
                                    onAuthSourceChange: (source) => setNetworkAuthSources((prev) => ({ ...prev, [row.id]: source })),
                                });
                            }),
                            showTestNets,
                            onToggleShowTestNets: () => setShowTestNets((prev) => !prev),
                        }))
                    : null;
    const accountDetailOverlay = accountDetailAddress
        ? react_1.default.createElement(AccountDetailPanel_1.default, {
            address: accountDetailAddress,
            // Only trust accountDetail once it actually answers the address
            // currently being viewed — otherwise this would briefly render a
            // still-fresh previous account's details (or stale undefined
            // fields) under the new address for one render, between the click
            // and the caller's own fetch resolving.
            ...(accountDetail && accountDetail.address === accountDetailAddress
                ? {
                    avatarSrc: accountDetail.avatarSrc,
                    name: accountDetail.name,
                    symbol: accountDetail.symbol,
                    email: accountDetail.email,
                    website: accountDetail.website,
                    description: accountDetail.description,
                    loading: false,
                }
                : { loading: true }),
        })
        : null;
    const tokenDetailOverlay = tokenDetailAddress
        ? react_1.default.createElement(TokenDetailPanel_1.default, {
            address: tokenDetailAddress,
            // Same "only trust it once it answers the current address" gate
            // as accountDetailOverlay above.
            ...(tokenDetail && tokenDetail.address === tokenDetailAddress
                ? {
                    logoSrc: tokenDetail.logoSrc,
                    name: tokenDetail.name,
                    symbol: tokenDetail.symbol,
                    decimals: tokenDetail.decimals,
                    website: tokenDetail.website,
                    explorer: tokenDetail.explorer,
                    description: tokenDetail.description,
                    loading: false,
                }
                : { loading: true }),
        })
        : null;
    // No loading branch needed — unlike accounts/tokens, this row's own data
    // (networkRowsSource) is already fully in memory the moment the icon is
    // clicked; see onNetworkIconClick's own doc comment on MeritWalletProps.
    const networkDetailRow = networkDetailId
        ? networkRowsSource.find((row) => row.id === networkDetailId)
        : undefined;
    const networkDetailOverlay = networkDetailRow
        ? react_1.default.createElement(NetworkDetailPanel_1.default, {
            id: networkDetailRow.id,
            logoSrc: networkDetailRow.iconSrc,
            name: networkDetailRow.name,
            symbol: networkDetailRow.symbol,
            isTestnet: networkDetailRow.isTestnet,
        })
        : null;
    const body = (_2 = (_1 = (_0 = accountDetailOverlay !== null && accountDetailOverlay !== void 0 ? accountDetailOverlay : tokenDetailOverlay) !== null && _0 !== void 0 ? _0 : networkDetailOverlay) !== null && _1 !== void 0 ? _1 : listOverlay) !== null && _2 !== void 0 ? _2 : tabBody;
    // Matches the real app's own per-tab titles (useActiveWalletPanelTitle.tsx,
    // its `sponsorshipPanelVisible`/`tradingTabVisible`/`sendTabVisible`/
    // `rewardsTabVisible` ternary) — PanelTitle's own default ("Trading
    // Station") only ever matched the Swap tab; without this, every other
    // tab kept showing that stale default instead of updating to reflect
    // which one is actually active.
    const panelTitle = accountDetailAddress
        ? 'Account Details'
        : tokenDetailAddress
            ? 'Token Details'
            : networkDetailId
                ? 'Network Details'
                : activeListMode === 'sellToken' ||
                    activeListMode === 'buyToken' ||
                    activeListMode === 'sendToken' ||
                    activeListMode === 'sponsorPayToken'
                    ? 'Select a Token'
                    : activeListMode === 'sendRecipient' || activeListMode === 'sponsorRecipient'
                        ? 'Select Recipient'
                        : activeListMode === 'account'
                            ? 'Active Account Selection'
                            : activeListMode === 'network'
                                ? 'Select Network'
                                : activeTab === 'SWAP'
                                    ? 'Trading Station'
                                    : activeTab === 'SEND'
                                        ? 'Send Account'
                                        : activeTab === 'SPONSOR'
                                            ? 'Add Sponsorship'
                                            : activeTab === 'REWARDS'
                                                ? 'Rewards Management'
                                                : 'Wallet Config';
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 5,
            width: fullWidth ? '100%' : 'min(364px, calc(100vw - 32px))',
            overflow: 'hidden',
            pointerEvents: 'auto',
            border: '1px solid #2e3654',
            background: '#0b0e19',
            color: '#fff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            ...(docked
                ? { height: '100%', borderRadius: 0, borderRight: 'none' }
                : { maxHeight: 'min(1000px, calc(100vh - 100px))', borderRadius: 15 }),
        }, children: [(0, jsx_runtime_1.jsx)(MeritPanelGate_1.default, { panel: panels_1.SP_COIN_DISPLAY.WALLET_NETWORK_HEADER, lazyLoad: false, children: (0, jsx_runtime_1.jsx)(WalletHeader_1.default, { mode: "normal", leftSlot: (0, jsx_runtime_1.jsx)(NetworkSelectDropDown_1.default, { label: activeNetworkRow === null || activeNetworkRow === void 0 ? void 0 : activeNetworkRow.name, 
                        // 2026-09-16, on live report ("the NetworkSelectDropDown is
                        // not showing the network icon in the WALLET_NETWORK_HEADER")
                        // — activeNetworkRow.iconSrc was already real (same value the
                        // Select Network list's own rows resolve their icon from
                        // below), this render site just never turned it into an
                        // <img> and passed it into NetworkSelectDropDown's own icon
                        // slot — same conversion the network-list rows already do.
                        icon: (activeNetworkRow === null || activeNetworkRow === void 0 ? void 0 : activeNetworkRow.iconSrc)
                            ? react_1.default.createElement('img', {
                                src: activeNetworkRow.iconSrc,
                                alt: '',
                                style: { width: '100%', height: '100%', objectFit: 'contain' },
                            })
                            : undefined, onSelectClick: () => setActiveListMode('network'), onIconClick: activeNetworkRow
                            ? () => {
                                setNetworkDetailId(activeNetworkRow.id);
                                onNetworkIconClick === null || onNetworkIconClick === void 0 ? void 0 : onNetworkIconClick(activeNetworkRow.id);
                            }
                            : undefined, chevronUp: activeListMode === 'network' }), titleBadgeSrc: titleBadgeSrc, onRefresh: onRefresh, refreshing: refreshing, onClose: onClose, closeIconSrc: closeIconSrc }) }), (0, jsx_runtime_1.jsx)(WalletAccountHeader_1.default, { icon: activeAccountEntry === null || activeAccountEntry === void 0 ? void 0 : activeAccountEntry.icon, address: activeAccountEntry === null || activeAccountEntry === void 0 ? void 0 : activeAccountEntry.address, symbol: activeAccountEntry === null || activeAccountEntry === void 0 ? void 0 : activeAccountEntry.symbol, name: activeAccountEntry === null || activeAccountEntry === void 0 ? void 0 : activeAccountEntry.name, onSelectClick: () => setActiveListMode('account'), onIconClick: (address) => {
                    if (!address)
                        return;
                    setAccountDetailAddress(address);
                    onAccountIconClick === null || onAccountIconClick === void 0 ? void 0 : onAccountIconClick(address);
                }, chevronUp: activeListMode === 'account' }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsx)(PanelTitle_1.default, { title: panelTitle, onMenuClick: handleMenuClick, menuOpen: menuOpen, 
                        // 2026-09-15 — the back arrow already existed (inert, no
                        // onBackClick ever passed); now real whenever a list overlay is
                        // open, closing it back to the tab it was opened from.
                        onBackClick: accountDetailAddress
                            ? () => setAccountDetailAddress(null)
                            : tokenDetailAddress
                                ? () => setTokenDetailAddress(null)
                                : networkDetailId
                                    ? () => setNetworkDetailId(null)
                                    : activeListMode
                                        ? () => setActiveListMode(null)
                                        : undefined }), (0, jsx_runtime_1.jsx)(MenuTabHeaderBar_1.default, { open: menuOpen, activeTab: activeTab, onTabClick: handleTabClick, children: body })] }), packageBuildTag_1.SHOW_BUILD_MARKERS && ((0, jsx_runtime_1.jsxs)("div", { style: {
                    position: 'absolute',
                    bottom: 2,
                    left: 6,
                    zIndex: 999999,
                    font: '9px monospace',
                    color: '#475569',
                    pointerEvents: 'none',
                }, children: ["\u27E8@sponsorcoin/spcoin-panels/MeritWallet.tsx \u00B7 build ", packageBuildTag_1.PACKAGE_BUILD, "\u27E9"] }))] }));
}
