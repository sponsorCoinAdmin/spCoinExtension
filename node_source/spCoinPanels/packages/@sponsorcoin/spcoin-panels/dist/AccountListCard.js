// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AccountListCard.tsx
// Portable version of the real app's GroupedAccountList.tsx + the "Add a
// Wallet/Account" button from AccountManagementPanel.tsx (2026-09-15) — the
// LOCAL_ACCOUNT_WALLET_LIST screen ("Active Account Selection"). Every
// sizing value below (rounded-[20px] card, 34px button/14px font/8px
// radius, 101px status-badge width, row height/padding via AssetListRow)
// is copied from those files' own dated comments — not re-guessed.
// Placeholder: static `groups` data, per-group collapse toggle is real
// (pure UI, matches the real component's own "no caller needs it" design),
// no real account-selection/MetaMask-connect logic behind any of it.
'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AccountListCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const AssetListRow_1 = __importDefault(require("./AssetListRow"));
const ScrollTablePanel_1 = __importDefault(require("./ScrollTablePanel"));
const STATUS_BADGE_STYLE = {
    display: 'flex',
    width: 101,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 12px',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#ffffff',
    border: 'none',
    height: 28,
    boxSizing: 'border-box',
};
function GroupHeader({ group, collapsed, onToggle }) {
    const showConnect = !group.isActiveSource && group.connectLabel;
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'stretch', background: '#2b2b2b' }, children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onToggle, "aria-pressed": collapsed, title: collapsed ? 'Show all accounts' : 'Show only the active account', style: {
                    display: 'flex',
                    minWidth: 0,
                    flex: 1,
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    color: 'rgba(203,213,225,0.8)',
                    cursor: 'pointer',
                }, children: [(0, jsx_runtime_1.jsx)("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: group.label }), collapsed ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 14 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronUp, { size: 14 })] }), showConnect ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: group.onConnectClick, style: { ...STATUS_BADGE_STYLE, background: '#16a34a', cursor: 'pointer' }, children: group.connectLabel })) : ((0, jsx_runtime_1.jsx)("span", { style: { ...STATUS_BADGE_STYLE, background: group.isActiveSource ? '#16a34a' : '#dc2626' }, children: group.isActiveSource ? 'Active' : 'Inactive' }))] }));
}
function AccountListCard({ groups, onAddWalletAccount, infoIconSrc }) {
    // Seeded (mount-only) into active-only mode for every group except the
    // currently active source — matches GroupedAccountList.tsx's own
    // useState initializer exactly (an inactive group reads as collapsed on
    // first open; purely a starting point after that, real toggle state
    // from here on).
    const [activeOnlyGroups, setActiveOnlyGroups] = (0, react_1.useState)(() => new Set(groups.filter((g) => !g.isActiveSource).map((g) => g.id)));
    const toggleGroup = (id) => {
        setActiveOnlyGroups((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, gap: 4 }, children: [(0, jsx_runtime_1.jsx)(ScrollTablePanel_1.default, { header: null, bufferPadding: "3px", style: { borderRadius: 12, border: '1px solid #334155', background: '#243056', color: '#5981F3', boxSizing: 'border-box' }, children: groups.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: 24, textAlign: 'center', fontSize: 12, color: '#94a3b8' }, children: "No accounts yet \u2014 add one below." })) : (groups.map((group, groupIndex) => {
                    const collapsed = activeOnlyGroups.has(group.id);
                    const visibleAccounts = collapsed ? group.accounts.filter((a) => a.isActive) : group.accounts;
                    return ((0, jsx_runtime_1.jsxs)("div", { style: { borderTop: groupIndex > 0 ? '1px solid #2e3654' : undefined }, children: [(0, jsx_runtime_1.jsx)(GroupHeader, { group: group, collapsed: collapsed, onToggle: () => toggleGroup(group.id) }), visibleAccounts.map((account, i) => ((0, jsx_runtime_1.jsx)("div", { style: { background: i % 2 === 0 ? 'rgba(56,78,126,0.35)' : 'rgba(156,163,175,0.25)' }, children: (0, jsx_runtime_1.jsx)(AssetListRow_1.default, { ...account, infoIconSrc: infoIconSrc, badge: account.isActive ? ((0, jsx_runtime_1.jsx)("span", { style: {
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            borderRadius: 4,
                                            background: '#16a34a',
                                            padding: '2px 6px',
                                            fontSize: 10,
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            color: '#ffffff',
                                        }, children: "Active" })) : undefined }) }, account.id)))] }, group.id));
                })) }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onAddWalletAccount, style: {
                    minHeight: 34,
                    maxHeight: 34,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    borderRadius: 8,
                    border: 'none',
                    background: '#243056',
                    color: '#5981F3',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: onAddWalletAccount ? 'pointer' : 'default',
                }, children: "Add a Wallet/Account" })] }));
}
