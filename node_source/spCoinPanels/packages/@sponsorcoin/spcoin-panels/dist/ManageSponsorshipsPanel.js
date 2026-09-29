// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ManageSponsorshipsPanel.tsx
// Portable shell for MANAGE_SPONSORSHIPS_PANEL (2026-09-12, revised 2026-09-24
// — "Extend the shell first"). The ORIGINAL version (2026-09-12) was a flat
// "Total Pending Rewards / [amount] / Claim" row + an empty
// GenericListPanel — it had no counterpart anywhere in the real app:
// components/views/RadioOverlayPanels/ManageSponsorshipsPanel.tsx actually
// renders a real SpCoins/Amount/Options table (Trading, Staked, Pending rows;
// Pending expands into Sponsor/Recipient/Agent sub-rows; a closing Total Coins
// row) that was simply never ported.
//
// 2026-09-24 — "Extend the shell first" promotion: this revision ports the
// real table's SHAPE + its full per-row state machine (loading, hover "N/A"
// swap, claim-in-progress "..." spinner, per-role estimate/claim, role
// availability, zero-amount guards) into the shell itself, using INLINE styles
// only — no Tailwind — so the extension (spCoinExtension) renders the same
// table it always did, in the same colors (REWARD_ROW_BG_A/B, which the real
// table's msTableTw.rowA/rowB are documented as the same values), with no
// changes to the extension's own build pipeline. See docs/design/
// extensionPlan.md's "Fourth slice" + "MANAGE_SPONSORSHIPS_PANEL shell-first"
// entries for the full investigation.
//
// Opaque-slot split (Stage 45): every NON-portable piece stays in the web
// app's thin wrapper (components/views/RadioOverlayPanels/
// ManageSponsorshipsPanel.tsx) and is fed in via props/slots — the AddressSelect
// tree (ExchangeContext/AssetSelect providers), the real on-chain estimate/
// claim calls (runRewardAction/runTotalRewardAction/runAvailableRoleRewardEstimates),
// the usePanelVisible panel-tree reads, the autoRefresh store, the ToDo
// overlay (doToDo/showToDo/todoMode/sessionStorage), and every derived display
// string (tradingAmountDisplay/stakedAmountDisplay/pendingTotalAmountDisplay/
// totalCoinsDisplay) — all resolved there and passed down. This shell is
// hook-free (barring local hover state) and @/-alias-free; an extension caller
// renders it inert by simply omitting props (all optional, safe zero/false
// defaults), exactly like every other component in this package.
// `pendingVisible` defaults to TRUE (expanded) when omitted, matching the
// extension MeritWallet's own "show the Rewards table fully expanded by
// default" seed for MANAGE_PENDING_REWARDS (see spCoinExtension MeritWallet.tsx
// lines 706-713); the web wrapper always passes this explicitly from
// usePanelVisible.
//
// Hover "N/A" swap: Trading/Staked/collapsed-Pending's buttons swap their
// label to "N/A" on hover only when the balance is zero (or the role is
// unavailable / no account); loading shows "Loading..." (orange pulse); a
// claim in flight shows "...". These mirror the real web table exactly.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';
import { REWARD_ROW_BG_A, REWARD_ROW_BG_B, REWARD_ROW_LABEL_WIDTH } from './RewardRow';
const LABEL_W = REWARD_ROW_LABEL_WIDTH;
const rowPad = { paddingTop: 1.5, paddingBottom: 1.5 };
const headerPad = { paddingTop: 3, paddingBottom: 3 };
const col0Style = { width: LABEL_W, minWidth: LABEL_W, maxWidth: LABEL_W };
const amountCommon = { flex: 1, textAlign: 'left', fontSize: 10, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const btnBase = {
    flexShrink: 0,
    minWidth: 76,
    borderRadius: 6,
    border: 'none',
    fontSize: 9,
    fontWeight: 600,
    paddingTop: 3,
    paddingBottom: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};
const btnGreen = { ...btnBase, background: '#147f3b', color: '#ffffff', cursor: 'pointer' };
const btnOrange = { ...btnBase, background: '#b8860b', color: '#ffffff', cursor: 'pointer' };
const btnOrangePulse = { ...btnBase, background: '#b8860b', color: '#ffffff', opacity: 0.6, cursor: 'not-allowed' };
const btnRed = { ...btnBase, background: '#ef4444', color: '#ffffff', cursor: 'pointer' };
export default function ManageSponsorshipsPanel({ tradingAmountText = '0', stakedAmountText = '0', pendingAmountText = '0', totalCoinsText = '0', tradingOrStalledLoading, tradingIsZero, onStake, onUnstake, onStakedLabelClick, stakedIsZero, autoRefresh, onAutoRefreshChange, pendingVisible = true, pendingInitialLoading, pendingRoleUnavailable, pendingIsZero, pendingClaimInProgress, pendingClaimDisabled, pendingErrorText, onPendingEstimate, onPendingClaim, onOpenPendingGroup, onPendingHeaderEstimate, onClosePendingGroup, rewardRows = [], onRoleEstimate, onRoleClaim, addressSelectContent, todoContent, }) {
    const [tradingHover, setTradingHover] = useState(false);
    const [stakedHover, setStakedHover] = useState(false);
    const [pendingHover, setPendingHover] = useState(false);
    const showPendingGroup = pendingVisible;
    const pendingClaiming = !!pendingClaimInProgress;
    const tradeLoading = !!tradingOrStalledLoading;
    const totalRowBg = showPendingGroup ? REWARD_ROW_BG_A : REWARD_ROW_BG_B;
    return (_jsxs("div", { id: "MANAGE_SPONSORSHIPS_PANEL", style: { position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }, children: [_jsx(TabBodyMarker, { path: "ManageSponsorshipsPanel.tsx", build: PACKAGE_BUILD }), addressSelectContent ? (_jsx("div", { style: { marginBottom: 0, flexShrink: 0 }, children: addressSelectContent })) : null, autoRefresh !== undefined && (_jsx("div", { style: { flexShrink: 0, display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }, children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: '#94a3b8' }, children: [_jsx("input", { type: "checkbox", checked: !!autoRefresh, onChange: (e) => onAutoRefreshChange?.(e.target.checked), style: { width: 13, height: 13, cursor: 'pointer', accentColor: '#5981F3' } }), "Auto Refresh"] }) })), _jsx("div", { style: { flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'auto' }, children: _jsxs("table", { id: "MANAGE_SPONSORSHIPS_TABLE", style: { borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', fontSize: 10 }, children: [_jsxs("colgroup", { children: [_jsx("col", { style: col0Style }), _jsx("col", {}), _jsx("col", {})] }), _jsx("thead", { children: _jsxs("tr", { style: { background: '#2b2b2b', borderBottom: '1px solid #000000' }, children: [_jsx("th", { scope: "col", style: { ...col0Style, ...headerPad }, align: "left", children: _jsx("span", { style: { fontSize: 9, fontWeight: 700, color: '#94a3b8' }, children: "SpCoins" }) }), _jsx("th", { scope: "col", style: headerPad, align: "left", children: _jsx("span", { style: { fontSize: 9, fontWeight: 700, color: '#94a3b8' }, children: "Amount" }) }), _jsx("th", { scope: "col", style: headerPad, align: "center", children: _jsx("span", { style: { fontSize: 9, fontWeight: 700, color: '#94a3b8' }, children: "Options" }) })] }) }), _jsxs("tbody", { children: [_jsxs("tr", { style: { borderTop: '1px solid #1e293b' }, children: [_jsx("td", { style: { ...col0Style, ...rowPad, background: REWARD_ROW_BG_A }, align: "left", children: _jsx("div", { style: { padding: '5px 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, title: "SpCoins Available for Staking/Trading", children: "Trading" }) }), _jsx("td", { style: rowPad, align: "left", children: _jsx("div", { style: amountCommon, title: tradingAmountText, children: _jsx("span", { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: tradingAmountText }) }) }), _jsx("td", { style: rowPad, align: "center", children: _jsx("div", { style: { display: 'flex', justifyContent: 'center' }, onMouseEnter: () => setTradingHover(true), onMouseLeave: () => setTradingHover(false), children: _jsx("button", { type: "button", style: tradeLoading ? btnOrangePulse : (tradingIsZero ? (tradingHover ? btnRed : btnOrange) : btnGreen), onClick: () => { if (!tradeLoading && !tradingIsZero)
                                                        onStake?.(); }, onMouseEnter: () => setTradingHover(true), onMouseLeave: () => setTradingHover(false), "aria-disabled": tradeLoading, "aria-label": "Open Trading Coins config", title: tradeLoading ? 'Loading...' : tradingIsZero ? 'Cannot Stake with 0 Balance' : 'Stake New Sponsorships', children: tradeLoading ? 'Loading...' : tradingIsZero && tradingHover ? 'N/A' : 'Stake' }) }) })] }), _jsxs("tr", { style: { borderTop: '1px solid #1e293b' }, children: [_jsx("td", { style: { ...col0Style, ...rowPad, background: REWARD_ROW_BG_B }, align: "left", children: _jsx("button", { type: "button", onClick: onStakedLabelClick, style: { padding: '5px 5px', fontSize: 10, fontWeight: 600, color: '#ffffff', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: onStakedLabelClick ? 'pointer' : 'default', background: 'transparent', border: 'none' }, "aria-label": "Open Staked list", title: "Manage SpCoin Staking Contracts.", children: "Staked" }) }), _jsx("td", { style: rowPad, align: "left", children: _jsx("div", { style: amountCommon, title: stakedAmountText, children: _jsx("span", { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: stakedAmountText }) }) }), _jsx("td", { style: rowPad, align: "center", children: _jsx("div", { style: { display: 'flex', justifyContent: 'center' }, onMouseEnter: () => setStakedHover(true), onMouseLeave: () => setStakedHover(false), children: _jsx("button", { type: "button", style: tradeLoading ? btnOrangePulse : (stakedIsZero ? (stakedHover ? btnRed : btnOrange) : btnGreen), onClick: () => { if (!tradeLoading && !stakedIsZero)
                                                        onUnstake?.(); }, onMouseEnter: () => setStakedHover(true), onMouseLeave: () => setStakedHover(false), "aria-disabled": tradeLoading, "aria-label": "Unstake All Sponsorships", title: tradeLoading ? 'Loading...' : stakedIsZero ? 'Empty Staking Balance' : 'Unstake All Sponsorships', children: tradeLoading ? 'Loading...' : stakedIsZero && stakedHover ? 'N/A' : 'Unstake' }) }) })] }), !showPendingGroup && (_jsxs("tr", { style: { borderTop: '1px solid #1e293b' }, children: [_jsx("td", { style: { ...col0Style, ...rowPad, background: REWARD_ROW_BG_A }, align: "left", children: _jsx("button", { type: "button", onClick: pendingRoleUnavailable ? undefined : onPendingEstimate, onContextMenu: (e) => { e.preventDefault(); onOpenPendingGroup?.(); }, disabled: !!pendingInitialLoading, style: { padding: '5px 5px', fontSize: 10, fontWeight: 600, color: '#ffffff', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', background: 'transparent', border: 'none' }, "aria-label": "Estimate total pending rewards", title: "Right Click to Expand", children: "Pending" }) }), _jsx("td", { style: rowPad, align: "left", children: _jsx("div", { style: amountCommon, title: pendingErrorText || pendingAmountText, children: _jsx("span", { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: pendingAmountText }) }) }), _jsx("td", { style: rowPad, align: "center", children: _jsx("div", { style: { display: 'flex', justifyContent: 'center' }, children: _jsx("button", { type: "button", style: pendingInitialLoading
                                                        ? btnOrangePulse
                                                        : (pendingRoleUnavailable || pendingIsZero)
                                                            ? (pendingHover ? btnRed : btnOrange)
                                                            : btnGreen, onClick: () => { if (!pendingRoleUnavailable && !pendingInitialLoading && !pendingIsZero)
                                                        onPendingClaim?.(); }, onMouseEnter: () => setPendingHover(true), onMouseLeave: () => setPendingHover(false), "aria-disabled": !!pendingInitialLoading, disabled: !!pendingClaimDisabled, "aria-label": "Claim all Sponsorship rewards", title: pendingRoleUnavailable
                                                        ? 'No Sponsor / Recipient / Agent role for this account'
                                                        : pendingInitialLoading
                                                            ? 'Loading...'
                                                            : pendingIsZero
                                                                ? 'No Pending Rewards'
                                                                : 'Claim all Pending Rewards', children: pendingInitialLoading ? 'Loading...' : pendingClaiming ? '...' : (pendingRoleUnavailable || pendingIsZero) && pendingHover ? 'N/A' : 'Claim' }) }) })] }))] }), showPendingGroup && (_jsxs("tbody", { id: "MANAGE_PENDING_REWARDS", children: [_jsxs("tr", { style: { borderTop: '1px solid #1e293b' }, children: [_jsx("td", { style: { ...col0Style, ...rowPad, background: REWARD_ROW_BG_A }, align: "left", children: _jsx("button", { type: "button", onClick: onPendingHeaderEstimate, onContextMenu: (e) => { e.preventDefault(); onClosePendingGroup?.(); }, style: { padding: '5px 5px', fontSize: 10, fontWeight: 600, color: '#ffffff', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', background: 'transparent', border: 'none' }, "aria-label": "Estimate pending rewards by account type", title: "Left Click to Estimate Roles. Right Click to Collapse", children: "Pending Rewards by Account Type" }) }), _jsx("td", { style: rowPad, align: "left" }), _jsx("td", { style: rowPad, align: "center" })] }), rewardRows.map((row, index) => {
                                    const rowBg = index % 2 === 0 ? REWARD_ROW_BG_B : REWARD_ROW_BG_A;
                                    const numericAmount = Number(row.amount);
                                    const isZeroOrEmptyAmount = !!row.available &&
                                        (row.amount == null || row.amount === '' || !Number.isFinite(numericAmount) || numericAmount <= 0);
                                    const claimColor = isZeroOrEmptyAmount ? btnOrange : btnGreen;
                                    const labelColor = row.available ? '#ffffff' : '#ef4444';
                                    return (_jsxs("tr", { style: { borderTop: '1px solid #1e293b' }, children: [_jsx("td", { style: { ...col0Style, ...rowPad, background: rowBg }, align: "left", children: _jsxs("button", { type: "button", onClick: row.available && !row.loading ? () => onRoleEstimate?.(row.role) : undefined, disabled: !row.available || row.loading, style: {
                                                        display: 'flex', alignItems: 'center', gap: 4, boxSizing: 'border-box',
                                                        paddingTop: 1.5, paddingBottom: 1.5, paddingLeft: 12, paddingRight: 5,
                                                        fontSize: 10, fontWeight: 600, color: labelColor, whiteSpace: 'nowrap',
                                                        overflow: 'hidden', textOverflow: 'ellipsis', cursor: row.available && !row.loading ? 'pointer' : 'default',
                                                        background: 'transparent', border: 'none',
                                                    }, "aria-label": `Estimate ${row.role} rewards`, title: row.available ? `Estimate ${row.role} pending rewards` : `${row.role} rewards are not available for this account.`, children: [_jsx("span", { style: { fontSize: 8 }, children: "\u2022" }), row.role] }) }), _jsx("td", { style: rowPad, align: "left", children: _jsx("div", { style: { ...amountCommon, color: row.available ? '#e2e8f0' : '#ef4444' }, title: row.error || row.amount || undefined, children: _jsx("span", { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: row.error ? 'Error' : row.amount }) }) }), _jsx("td", { style: rowPad, align: "center", children: _jsx("div", { style: { display: 'flex', justifyContent: 'center' }, children: _jsx("button", { type: "button", style: claimColor, onClick: () => { if (row.available && !row.loading && !isZeroOrEmptyAmount)
                                                            onRoleClaim?.(row.role); }, disabled: !row.available || row.loading || isZeroOrEmptyAmount, "aria-label": `Claim ${row.role} rewards`, title: !row.available
                                                            ? `${row.role} rewards are not available for this account.`
                                                            : isZeroOrEmptyAmount
                                                                ? `No ${row.role} rewards pending yet.`
                                                                : `Claim ${row.role} rewards`, children: isZeroOrEmptyAmount ? 'Pending' : 'Claim' }) }) })] }, row.role));
                                })] })), _jsx("tbody", { children: _jsxs("tr", { style: { borderTop: '1px solid #1e293b' }, children: [_jsx("td", { style: { ...col0Style, ...rowPad, background: totalRowBg }, align: "left", children: _jsx("div", { style: { padding: '5px 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, title: "Total Available SpCoins", children: "Total Coins" }) }), _jsx("td", { colSpan: 2, style: rowPad, align: "left", children: _jsx("div", { style: amountCommon, title: totalCoinsText, children: _jsx("span", { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: totalCoinsText }) }) })] }) })] }) }), todoContent ? _jsx("div", { style: { zIndex: 2000 }, children: todoContent }) : null] }));
}
