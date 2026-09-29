// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AccountListRewardsPanel.tsx
// Portable shell for ACCOUNT_LIST_REWARDS_PANEL (31) — promoted from the web
// app's components/views/RadioOverlayPanels/AccountListRewardsPanel/index.tsx
// (543 ln). Non-portable pieces — every Tailwind className (this package has
// no Tailwind pipeline), next/image (web app only), AddressSelect (web app,
// wraps useExchangeContext), useOpenAccountComponent / ExchangeContext
// role-account writes, the ToDo debug overlay — all stay in the web-app
// wrapper and are fed in as opaque slots/callbacks, same "opaque-slot split"
// shape as StakingControllerPanel / ManageSponsorshipsPanel this session.
//
// What moved here: the PanelGate-visibility reads (via usePanelVisible from
// @sponsorcoin/spcoin-exchange-engine, the same shared singleton panelStore
// every other package component reads), the listType / accountType /
// accountRole derivation logic, the chevron open/close state machine
// (useState + localStorage, same keys), the container layout, the table
// structure, the per-row AccountCell / RewardsSubTable / TotalRow rendering —
// pixel-identical structure to the real web app version, expressed in inline
// styles (colors/spacing copied from the real msTableTw and constants.ts so
// the extension renders the same table it always did).
//
// 2026-09-24, on request ("migrate ACCOUNT_LIST_REWARDS_PANEL"): the real
// component is large and tightly coupled to ExchangeContext, but the only
// things that have to move are the layout + visibility + derivation — every
// data-dependent and web-only surface stays in the wrapper via props.
'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { AccountType } from '@sponsorcoin/spcoin-common/context';
import { usePanelVisible, usePanelTree } from '@sponsorcoin/spcoin-exchange-engine';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';
import { REWARD_ROW_BG_A, REWARD_ROW_BG_B } from './RewardRow';
const LS_CHEVRON_OPEN_KEY = 'spcoin:chevron_down_open_pending';
void roleLabelToRoleKind;
const EMPTY_SUBROWS = Object.freeze({});
const col0Width = 88;
const rowPad = { paddingTop: 2, paddingBottom: 2 };
const headerPad = { paddingTop: 6, paddingBottom: 6 };
const col0Style = { width: col0Width, minWidth: col0Width, maxWidth: col0Width };
const amountCommon = {
    fontSize: 13,
    color: '#e2e8f0',
    opacity: 0.8,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};
const btnGreen = {
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
    background: '#147f3b',
    color: '#ffffff',
    cursor: 'pointer',
};
const chevronBtnBase = {
    margin: 0,
    padding: 0,
    borderRadius: 6,
    width: 21,
    height: 21,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
};
const tipStyle = {
    position: 'fixed',
    zIndex: 9999,
    pointerEvents: 'none',
    background: '#ffffff',
    color: '#000000',
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 12,
    lineHeight: 1.2,
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    maxWidth: 260,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};
function isPendingPanel(p) {
    return (p === SP_COIN_DISPLAY.PENDING_SPONSOR_REWARDS ||
        p === SP_COIN_DISPLAY.PENDING_RECIPIENT_REWARDS ||
        p === SP_COIN_DISPLAY.PENDING_AGENT_REWARDS);
}
function roleLabelToRoleKind(roleLabel) {
    const s = (roleLabel ?? '').toString().trim().toLowerCase();
    if (s === 'recipient')
        return 'recipient';
    if (s === 'agent')
        return 'agent';
    if (s === 'sponsor')
        return 'sponsor';
    return 'unknown';
}
function getRowLabelTitle(label) {
    if (label === 'Staked')
        return 'Staked SpCoin Quantity';
    if (label === 'Sponsor')
        return 'Pending Sponsor SpCoin Rewards';
    if (label === 'Recipient')
        return 'Pending Recipient SpCoin Rewards';
    if (label === 'Agent')
        return 'Pending Agent SpCoin Rewards';
    return '';
}
function getAddressText(w) {
    if (typeof w?.address === 'string')
        return w.address;
    const a = w?.address;
    if (!a)
        return 'N/A';
    const cand = a.address ?? a.hex ?? a.bech32 ?? a.value ?? a.id;
    try {
        return cand ? String(cand) : JSON.stringify(a);
    }
    catch {
        return 'N/A';
    }
}
function getActionButtonAriaLabel(buttonText, label) {
    if (buttonText === 'Claim' && label === 'Sponsor')
        return 'Claim Sponsor SpCoin Pending Rewards';
    if (buttonText === 'Claim' && label === 'Recipient')
        return 'Claim Recipient SpCoin Pending Rewards';
    if (buttonText === 'Claim' && label === 'Agent')
        return 'Claim Agent SpCoin Pending Rewards';
    if (buttonText === 'Unstake' && label === 'Staked')
        return 'Unstake SpCoins';
    return `${buttonText} ${label}`;
}
function getClaimRowFgColor(label, cfgClaimSponsor, cfgClaimAgent, cfgClaimRecipient) {
    const LIGHT_GREEN = '#4ade80';
    if (cfgClaimSponsor && (label === 'Sponsor' || label === 'Staked'))
        return LIGHT_GREEN;
    if (!cfgClaimSponsor && cfgClaimAgent && label === 'Agent')
        return LIGHT_GREEN;
    if (!cfgClaimSponsor && !cfgClaimAgent && cfgClaimRecipient && label === 'Recipient')
        return LIGHT_GREEN;
    return '#ffffff';
}
function ExpandRow({ open, children }) {
    return (_jsx("div", { style: {
            display: 'grid',
            gridTemplateRows: open ? '1fr' : '0fr',
            opacity: open ? 1 : 0,
            transform: open ? 'translateY(0)' : 'translateY(-4px)',
            transition: 'grid-template-rows 200ms ease-out, opacity 200ms ease-out, transform 200ms ease-out',
        }, children: _jsx("div", { style: { overflow: 'hidden' }, children: children }) }));
}
function DefaultAccountCellImpl({ account, roleLabel, addressText, onPick, onRowEnter, onRowMove, onRowLeave, }) {
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }, children: [_jsx("button", { type: "button", style: { background: 'transparent', padding: 0, margin: 0, cursor: 'pointer' }, onMouseEnter: () => onRowEnter(account?.name ?? ''), onMouseMove: onRowMove, onMouseLeave: onRowLeave, onClick: () => onPick(account), "aria-label": `Open ${roleLabel}s reconfigure`, "data-role": roleLabel, "data-address": addressText, children: _jsx("img", { src: account?.logoURL || '/assets/miscellaneous/placeholder.png', alt: `${account?.name ?? 'Wallet'} logo`, title: `${roleLabel} ${account?.name ?? 'Unknown'} Account Details`, width: 38, height: 38, style: { width: 38, height: 38, objectFit: 'contain', background: 'transparent' } }) }), _jsxs("div", { style: { minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }, children: [_jsx("div", { style: { width: '100%', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', color: '#5981F3' }, children: account?.name ?? 'Unknown' }), _jsx("div", { style: { width: '100%', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', color: '#5981F3' }, children: account?.symbol ?? '' })] })] }));
}
function AccountCellImpl({ account, roleLabel, addressText, onPick, onRowEnter, onRowMove, onRowLeave, accountCellSlot, }) {
    const Impl = accountCellSlot ?? DefaultAccountCellImpl;
    return (_jsx(Impl, { account: account, roleLabel: roleLabel, addressText: addressText, onPick: onPick, onRowEnter: onRowEnter, onRowMove: onRowMove, onRowLeave: onRowLeave }));
}
function RewardsSubTable({ zebra, walletKey, walletIndex, tokenRowVisible, showRow3, showRow4, showRow5, rewardsOpen, showRewardsRow, showUnSponsorRow, isSponsorMode, cfgClaimSponsor, cfgClaimAgent, cfgClaimRecipient, onSetWalletRows3to5Open, onClaim, }) {
    const rewardsDetailsTitle = tokenRowVisible
        ? 'Hide Rewards Contract Details'
        : 'Show Rewards Contract Details';
    const stakedDetailsTitle = tokenRowVisible
        ? 'Hide Staked Contract Details'
        : 'Show Staked Contract Details';
    const toggleRows3to5 = useCallback(() => {
        onSetWalletRows3to5Open(walletKey, !rewardsOpen);
    }, [onSetWalletRows3to5Open, walletKey, rewardsOpen]);
    const stakedOpen = showUnSponsorRow;
    function renderNestedRewardsRow() {
        if (!showRewardsRow)
            return null;
        return (_jsx("tr", { "aria-hidden": false, children: _jsx("td", { colSpan: 2, style: { padding: 0 }, title: "Pending SpCoin Rewards", children: _jsx(ExpandRow, { open: true, children: _jsxs("div", { style: { minHeight: 34, paddingTop: 2, paddingBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, children: [_jsxs("div", { style: { minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("button", { type: "button", onClick: toggleRows3to5, style: { fontSize: 13, cursor: 'pointer', textAlign: 'left', paddingLeft: 10, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: 'none', background: 'transparent' }, "aria-label": rewardsDetailsTitle, title: rewardsDetailsTitle, children: "Rewards" }), _jsx("div", { style: { ...amountCommon, minWidth: 0 }, title: "0.0", children: "0.0" })] }), _jsx("button", { type: "button", style: btnGreen, "aria-label": "Claim SpCoin Rewards", title: "Claim SpCoin Rewards", onClick: () => onClaim(AccountType.ALL, walletIndex, 'Rewards'), children: "Claim" })] }) }) }) }));
    }
    function renderNestedTokenContractRow(open) {
        return (_jsx("tr", { "aria-hidden": !open, children: _jsx("td", { colSpan: 2, style: { padding: 0 }, children: _jsx(ExpandRow, { open: open, children: _jsx("div", { style: { minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx("div", { style: { width: '100%', textAlign: 'center', fontSize: 14.3, lineHeight: 1.15, color: '#5981F3' }, children: "Sponsor Coin Contract Rewards Details" }) }) }) }) }));
    }
    function renderNestedClaimRow(open, label, valueText, type) {
        const isUnstakeRow = label === 'Staked';
        const buttonText = 'Unstake';
        const showButton = isUnstakeRow ? isSponsorMode : false;
        const actionText = getActionButtonAriaLabel(buttonText, label);
        const labelTitle = getRowLabelTitle(label);
        const fgColor = getClaimRowFgColor(label, cfgClaimSponsor, cfgClaimAgent, cfgClaimRecipient);
        if (!isUnstakeRow) {
            const isIndentedLabel = label === 'Sponsor' || label === 'Recipient' || label === 'Agent';
            return (_jsx("tr", { "aria-hidden": !open, children: _jsx("td", { colSpan: 2, style: { padding: 0, color: fgColor }, title: labelTitle, children: _jsx(ExpandRow, { open: open, children: _jsxs("div", { style: { minHeight: 34, paddingTop: 2, paddingBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, children: [_jsxs("div", { style: { minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }, children: [!isIndentedLabel && (_jsx("button", { type: "button", style: { margin: 0, padding: 0, borderRadius: 6, width: 21, height: 21, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', visibility: 'hidden', outline: 'none', background: 'transparent', cursor: 'default' }, "aria-hidden": "true", tabIndex: -1 })), _jsx("div", { style: { width: col0Width, visibility: 'hidden' }, "aria-hidden": "true" }), _jsx("div", { style: { ...amountCommon, minWidth: 0 }, children: valueText }), isIndentedLabel ? (_jsx("div", { style: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }, children: _jsx("div", { style: { fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: col0Width }, children: label }) })) : null] }), _jsx("div", { style: { flexShrink: 0 } })] }) }) }) }));
        }
        return (_jsx("tr", { "aria-hidden": !open, children: _jsx("td", { colSpan: 2, style: { padding: 0 }, title: labelTitle, children: _jsx(ExpandRow, { open: open, children: _jsxs("div", { style: { minHeight: 34, paddingTop: 2, paddingBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, children: [_jsxs("div", { style: { minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, color: fgColor }, children: [_jsx("button", { type: "button", onClick: toggleRows3to5, style: { fontSize: 13, cursor: 'pointer', textAlign: 'left', paddingLeft: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: 'none', background: 'transparent' }, "aria-label": label === 'Staked' ? stakedDetailsTitle : rewardsDetailsTitle, title: label === 'Staked' ? stakedDetailsTitle : rewardsDetailsTitle, children: label }), _jsx("div", { style: { ...amountCommon, minWidth: 0 }, children: valueText })] }), _jsx("button", { type: "button", style: { ...btnGreen, visibility: showButton ? 'visible' : 'hidden' }, "aria-label": actionText, title: actionText, onClick: () => {
                                    if (!showButton)
                                        return;
                                    onClaim(type, walletIndex, label);
                                }, children: buttonText })] }) }) }) }));
    }
    return (_jsx("tr", { children: _jsx("td", { colSpan: 2, style: { background: zebra, padding: 0, verticalAlign: 'top' }, children: _jsxs("table", { style: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }, children: [_jsxs("colgroup", { children: [_jsx("col", { style: { width: col0Width } }), _jsx("col", {})] }), _jsxs("tbody", { children: [renderNestedRewardsRow(), renderNestedClaimRow(stakedOpen, 'Staked', '0.0', AccountType.SPONSOR), renderNestedTokenContractRow(tokenRowVisible), renderNestedClaimRow(showRow3, 'Sponsor', '0.0', AccountType.SPONSOR), renderNestedClaimRow(showRow4, 'Recipient', '0.0', AccountType.RECIPIENT), renderNestedClaimRow(showRow5, 'Agent', '0.0', AccountType.AGENT)] })] }) }) }));
}
function TotalRow({ zebra, actionButtonText, accountType, onClaim, }) {
    return (_jsx("tr", { id: "REWARDS_TABLE_TOTAL", style: { borderBottom: '1px solid #000000' }, children: _jsx("td", { colSpan: 2, style: { background: zebra, padding: 0 }, children: _jsxs("div", { style: { minHeight: 34, paddingTop: 2, paddingBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, children: [_jsxs("div", { style: { minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }, children: [_jsx("button", { type: "button", style: { margin: 0, padding: 0, borderRadius: 6, width: 21, height: 21, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', visibility: 'hidden', outline: 'none', background: '#f59e0b', cursor: 'default' }, "aria-hidden": "true", tabIndex: -1, children: _jsx("svg", { width: "21", height: "21", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polyline", { points: "18 15l-6-6-6 6" }) }) }), _jsx("div", { style: { width: col0Width, visibility: 'hidden' } }), _jsx("div", { style: { ...amountCommon, minWidth: 0 }, children: "0.0" }), _jsx("div", { style: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }, children: _jsx("div", { style: { fontSize: 19.5, lineHeight: 1.15, whiteSpace: 'nowrap', width: col0Width }, children: "Total" }) })] }), _jsx("button", { type: "button", style: btnGreen, "aria-label": `${actionButtonText} total`, onClick: () => onClaim(accountType, -1, `${actionButtonText} (TOTAL)`), children: actionButtonText })] }) }) }));
}
export default function AccountListRewardsPanel({ accountList, setAccountCallBack, panelId = SP_COIN_DISPLAY.ACCOUNT_LIST_REWARDS_PANEL, chevronPanelId = SP_COIN_DISPLAY.CHEVRON_DOWN_OPEN_PENDING, containerType, addressSelectContent, todoContent, accountCellSlot, onPickAccount, onClaimRewards, chevronOpenOverride, onChevronToggle, }) {
    const cfgClaimAgent = usePanelVisible(SP_COIN_DISPLAY.PENDING_AGENT_REWARDS);
    const cfgClaimRecipient = usePanelVisible(SP_COIN_DISPLAY.PENDING_RECIPIENT_REWARDS);
    const cfgClaimSponsor = usePanelVisible(SP_COIN_DISPLAY.PENDING_SPONSOR_REWARDS);
    const showUnSponsorRow = usePanelVisible(SP_COIN_DISPLAY.ACTIVE_SPONSORSHIPS);
    const cfgChevronOpen = usePanelVisible(chevronPanelId);
    const { setPanelVisible } = usePanelTree();
    const [localChevronOpen, setLocalChevronOpen] = useState(false);
    const didHydrateChevronRef = useRef(false);
    useEffect(() => {
        setLocalChevronOpen(cfgChevronOpen);
        if (didHydrateChevronRef.current)
            return;
        didHydrateChevronRef.current = true;
        const lsOpen = localStorage.getItem(LS_CHEVRON_OPEN_KEY);
        const hasLs = lsOpen === 'true' || lsOpen === 'false';
        if (!hasLs)
            return;
        const resolvedOpen = lsOpen === 'true';
        setLocalChevronOpen(resolvedOpen);
        setPanelVisible(chevronPanelId, resolvedOpen, 'AccountListRewardsPanel:hydrateChevron');
    }, [cfgChevronOpen, chevronPanelId]);
    const effectiveChevronOpen = chevronOpenOverride !== undefined ? chevronOpenOverride : (cfgChevronOpen || localChevronOpen);
    const handleChevronToggle = useCallback((open) => {
        setLocalChevronOpen(open);
        localStorage.setItem(LS_CHEVRON_OPEN_KEY, String(open));
        setPanelVisible(chevronPanelId, open, 'AccountListRewardsPanel:toggleChevron');
        onChevronToggle?.(open);
    }, [chevronPanelId, onChevronToggle]);
    const listType = (() => {
        if (showUnSponsorRow)
            return SP_COIN_DISPLAY.ACTIVE_SPONSORSHIPS;
        if (cfgClaimSponsor)
            return SP_COIN_DISPLAY.PENDING_SPONSOR_REWARDS;
        if (cfgClaimRecipient)
            return SP_COIN_DISPLAY.PENDING_RECIPIENT_REWARDS;
        if (cfgClaimAgent)
            return SP_COIN_DISPLAY.PENDING_AGENT_REWARDS;
        return SP_COIN_DISPLAY.ACCOUNT_LIST_REWARDS_PANEL;
    })();
    const { vAgents, vRecipients } = (() => {
        if (cfgClaimAgent)
            return { vAgents: true, vRecipients: false };
        if (cfgClaimRecipient)
            return { vAgents: false, vRecipients: true };
        if (cfgClaimSponsor || showUnSponsorRow)
            return { vAgents: false, vRecipients: false };
        return { vAgents: false, vRecipients: false };
    })();
    const accountType = vAgents ? AccountType.AGENT : vRecipients ? AccountType.RECIPIENT : AccountType.SPONSOR;
    const { accountRole1, accountRole2 } = (() => {
        if (cfgClaimSponsor)
            return { accountRole1: 'Agent', accountRole2: 'Recipient' };
        if (cfgClaimRecipient)
            return { accountRole1: 'Sponsor', accountRole2: 'Agent' };
        if (cfgClaimAgent)
            return { accountRole1: 'Sponsor', accountRole2: 'Recipient' };
        return { accountRole1: 'Accounts', accountRole2: 'Accounts' };
    })();
    const showRewardsRow = cfgClaimSponsor || cfgClaimRecipient || cfgClaimAgent;
    const isSponsorMode = showUnSponsorRow || cfgClaimSponsor;
    const [openByWalletKey, setOpenByWalletKey] = useState({});
    const [showToDo, setShowToDo] = useState(false);
    void openByWalletKey;
    const [tip, setTip] = useState({
        show: false, text: '', x: 0, y: 0,
    });
    void setAccountCallBack;
    void containerType;
    const claimRewards = useCallback((type, accountId, label) => {
        setShowToDo(true);
        onClaimRewards?.(type, accountId, label);
    }, [onClaimRewards]);
    const doToDo = useCallback(() => {
        setShowToDo(false);
    }, []);
    const setWalletRows3to5Open = useCallback((walletKey, open) => {
        setOpenByWalletKey((prev) => {
            const cur = prev[walletKey] ?? EMPTY_SUBROWS;
            const nextForKey = { ...cur, sponsor: open, recipient: open, agent: open, staked: open };
            return { ...prev, [walletKey]: nextForKey };
        });
    }, []);
    const actionButtonLabel = listType === SP_COIN_DISPLAY.ACTIVE_SPONSORSHIPS
        ? 'Unsponsor'
        : isPendingPanel(listType)
            ? 'Claim'
            : 'Action';
    const actionButtonText = actionButtonLabel === 'Claim' ? 'Claim All' : actionButtonLabel;
    const onRowEnter = (name) => setTip((t) => ({ ...t, show: true, text: name ?? '' }));
    const onRowMove = (e) => setTip((t) => ({ ...t, x: e.clientX, y: e.clientY }));
    const onRowLeave = () => setTip((t) => ({ ...t, show: false }));
    const handlePickForRole = useCallback((roleLabel, picked) => {
        onPickAccount?.(picked, roleLabel);
        try {
            setAccountCallBack?.(picked);
        }
        catch { }
    }, [onPickAccount, setAccountCallBack]);
    return (_jsxs(_Fragment, { children: [_jsx(TabBodyMarker, { path: "AccountListRewardsPanel.tsx", build: PACKAGE_BUILD }), addressSelectContent ? _jsx("div", { style: { flexShrink: 0 }, children: addressSelectContent }) : null, tip.show && tip.text ? (_jsx("div", { style: { ...tipStyle, left: tip.x, top: tip.y, transform: 'translate(-50%, -120%)' }, children: tip.text })) : null, _jsxs("div", { id: SP_COIN_DISPLAY[panelId], style: {
                    flex: 1,
                    minHeight: 0,
                    overflowX: 'auto',
                    overflowY: 'auto',
                    borderRadius: 8,
                    border: '1px solid #000000',
                    marginTop: 0,
                    marginBottom: 0,
                }, "data-list-type": SP_COIN_DISPLAY[listType], children: [listType === SP_COIN_DISPLAY.ACTIVE_SPONSORSHIPS && (_jsx("div", { id: "ACTIVE_SPONSORSHIPS", className: "hidden", "aria-hidden": "true" })), listType === SP_COIN_DISPLAY.PENDING_SPONSOR_REWARDS && (_jsx("div", { id: "PENDING_SPONSOR_REWARDS", className: "hidden", "aria-hidden": "true" })), listType === SP_COIN_DISPLAY.PENDING_RECIPIENT_REWARDS && (_jsx("div", { id: "PENDING_RECIPIENT_REWARDS", className: "hidden", "aria-hidden": "true" })), listType === SP_COIN_DISPLAY.PENDING_AGENT_REWARDS && (_jsx("div", { id: "PENDING_AGENT_REWARDS", className: "hidden", "aria-hidden": "true" })), cfgChevronOpen && (_jsx("div", { id: "CHEVRON_DOWN_OPEN_PENDING", className: "hidden", "aria-hidden": "true" })), _jsxs("table", { id: "ACCOUNT_LIST_REWARDS_TABLE", style: { minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: '#2b2b2b', borderBottom: '1px solid #000000' }, children: [_jsx("th", { scope: "col", style: { width: '50%', ...col0Style, ...headerPad, textAlign: 'left' }, children: _jsxs("div", { style: { width: '100%', display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("button", { type: "button", style: {
                                                            ...chevronBtnBase,
                                                            background: effectiveChevronOpen ? '#f59e0b' : '#2563eb',
                                                        }, "aria-label": effectiveChevronOpen
                                                            ? 'Chevron Up (Close all wallet rows)'
                                                            : 'Chevron Down (Open all Sponsorship Account Rows)', title: effectiveChevronOpen ? 'Close all wallet rows' : 'Open all account rows', onClick: () => handleChevronToggle(!effectiveChevronOpen), children: effectiveChevronOpen ? (_jsx("svg", { width: "21", height: "21", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polyline", { points: "18 15l-6-6-6 6" }) })) : (_jsx("svg", { width: "21", height: "21", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polyline", { points: "6 9l6 6 6-6" }) })) }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis' }, children: accountRole1 })] }) }), _jsx("th", { scope: "col", style: { width: '50%', ...headerPad, textAlign: 'left' }, children: accountRole2 })] }) }), _jsxs("tbody", { children: [accountList.map((w, i) => {
                                        const zebra = i % 2 === 0 ? REWARD_ROW_BG_A : REWARD_ROW_BG_B;
                                        const addressText = getAddressText(w);
                                        const walletKey = String(w?.id ?? addressText ?? i);
                                        const stableKey = w?.id ?? `${i}-${addressText}`;
                                        const revIndex = accountList.length - 1 - i;
                                        const rw = accountList[revIndex];
                                        const rwAddressText = getAddressText(rw);
                                        return (_jsxs(React.Fragment, { children: [_jsxs("tr", { style: { borderBottom: '1px solid #000000' }, children: [_jsx("td", { style: { width: '50%', background: zebra, ...rowPad, paddingLeft: 0, verticalAlign: 'middle' }, children: _jsx(AccountCellImpl, { account: w, roleLabel: accountRole1, addressText: addressText, onPick: (picked) => handlePickForRole(accountRole1, picked), onRowEnter: onRowEnter, onRowMove: onRowMove, onRowLeave: onRowLeave, accountCellSlot: accountCellSlot }) }), _jsx("td", { style: { width: '50%', background: zebra, ...rowPad, paddingLeft: 0, verticalAlign: 'middle' }, children: _jsx(AccountCellImpl, { account: rw, roleLabel: accountRole2, addressText: rwAddressText, onPick: (picked) => handlePickForRole(accountRole2, picked), onRowEnter: onRowEnter, onRowMove: onRowMove, onRowLeave: onRowLeave, accountCellSlot: accountCellSlot }) })] }), _jsx(RewardsSubTable, { zebra: zebra, walletKey: walletKey, walletIndex: i, tokenRowVisible: !!effectiveChevronOpen, showRow3: !!effectiveChevronOpen, showRow4: !!effectiveChevronOpen, showRow5: !!effectiveChevronOpen, rewardsOpen: !!effectiveChevronOpen, showRewardsRow: showRewardsRow, showUnSponsorRow: showUnSponsorRow, isSponsorMode: isSponsorMode, cfgClaimSponsor: cfgClaimSponsor, cfgClaimAgent: cfgClaimAgent, cfgClaimRecipient: cfgClaimRecipient, onSetWalletRows3to5Open: setWalletRows3to5Open, onClaim: claimRewards })] }, stableKey));
                                    }), _jsx(TotalRow, { zebra: accountList.length % 2 === 0 ? REWARD_ROW_BG_A : REWARD_ROW_BG_B, actionButtonText: actionButtonText, accountType: accountType, onClaim: claimRewards })] })] })] }), showToDo && (_jsx("div", { style: { zIndex: 2000 }, onClick: doToDo, children: todoContent ?? _jsx(ToDoPlaceholder, {}) }))] }));
}
function ToDoPlaceholder() {
    return (_jsx("div", { style: {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 26, 26, 0.5)',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: 8,
            zIndex: 2000,
            fontSize: 12,
            cursor: 'pointer',
        }, children: "ToDo" }));
}
