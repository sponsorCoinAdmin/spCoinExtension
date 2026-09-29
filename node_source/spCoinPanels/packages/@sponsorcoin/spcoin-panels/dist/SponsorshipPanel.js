// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SponsorshipPanel.tsx
// Portable shell for SPONSORSHIP_PANEL — extracted from the web app's real
// components/views/RadioOverlayPanels/SponsorPanel.tsx (542 ln). The real
// component's non-portable pieces (useSponsorMode, useSellTokenContract/
// useBuyTokenContract/useSellAmount/useBuyAmount, useUniswapV3CombinedQuote,
// getStakedAmountForRecipient/getSponsorRecipientRateKeys, exchangeContext-derived
// network/rpc/decimals reads, stakeAmountStore/stakeRefreshStore, and the on-
// chain stake/un-stake dispatch in lib/spCoin/swap.tsx) all stay in the web-app
// wrapper, resolved there and passed down as opaque slots / plain props — same
// "opaque-slot split" shape as ConfigSlippagePanel / TokenAddressComponent /
// AffiliateFee / AgentHeaderPanel this session.
//
// What moves here: the layout container itself — the PanelGate over
// SPONSORSHIP_PANEL, the outer flex column, the SPONSOR_EXCHANGE_TRADING_PAIR
// gate, the two swapped tokenBlock/recipientBlock slots, and the trailing
// ConnectTradeButton / AffiliateFee / FeeDisclosure slot order — pixel-identical
// to the real web app's structure (see SponsorPanel.tsx's own inline comments
// for the spacing/padding history). The mode-derived recipientOnTop swap and
// the configId conditional both stay in the web wrapper — they're pure data
// decisions, not layout.
//
// An inert fallback path (the original placeholder's "You are Sponsoring"
// header + two TradeAmountRows + submit + Fee Disclosures line) is retained for
// consumers that pass no real child slots — still the extension's sidepanel.ts,
// whose Sponsor tab is driven by the package's own selections state but whose
// child components (RecipientSelectPanel / ConfigSponsorshipPanel /
// SellSelectPanel / StakingStatusPanel / ConnectTradeButton) have not been
// promoted to this package yet. See docs/estimate.txt /
// docs/panelMigrationStatus.txt.
//
// 2026-09-23, on request ("migrate SPONSORSHIP_PANEL to npm") — first real
// migration of this panel. The EXT track (wiring the real child components into
// the extension's Sponsor tab) is deferred — see the 2026-09-22 handoff entry
// for why this panel needs Phase B.2 (real Uniswap quote + stake calls) and
// the 2026-09-23 "What's NOT done" list.
'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { SP_COIN_DISPLAY as SP } from '@sponsorcoin/spcoin-common/panels';
import { PANEL_GAP } from '@sponsorcoin/spcoin-common/styles';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';
import PanelGate from './PanelGate';
import TradeAmountRow from './TradeAmountRow';
export default function SponsorshipPanel({ recipientSelectPanel, configSponsorshipPanel, exchangeTradingPair, connectTradeButton, affiliateFee, feeDisclosure, recipientName = 'Recipient Name not Specified', payTokenSymbol, payTokenAddress, payTokenIcon, stakedTokenSymbol, stakedTokenAddress, stakedTokenIcon, onSubmit, submitLabel = 'Enter an Amount', onRecipientClick, onPayTokenClick, onStakedRecipientIconClick, sponsorAmount, onSponsorAmountChange, sponsorAmountBusy, onSponsorSwapSubmit, sponsorSwapBusy, }) {
    // A real caller passes at least one slot; the extension passes none and
    // falls back to the inert path below.
    const hasRealSlots = !!recipientSelectPanel ||
        !!configSponsorshipPanel ||
        !!exchangeTradingPair ||
        !!connectTradeButton ||
        !!affiliateFee ||
        !!feeDisclosure;
    return (_jsx(PanelGate, { panel: SP.SPONSORSHIP_PANEL, lazyLoad: false, children: _jsxs("div", { id: "SPONSORSHIP_PANEL", style: {
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: PANEL_GAP,
            }, children: [_jsx(TabBodyMarker, { path: "SponsorshipPanel.tsx", build: PACKAGE_BUILD }), hasRealSlots ? (_jsxs(_Fragment, { children: [recipientSelectPanel, configSponsorshipPanel, exchangeTradingPair, connectTradeButton, affiliateFee, feeDisclosure] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { onClick: onRecipientClick, style: { textAlign: 'center', cursor: onRecipientClick ? 'pointer' : 'default' }, children: [_jsx("div", { style: { fontSize: 10, color: '#94a3b8' }, children: "You are Sponsoring" }), _jsx("div", { style: { fontSize: 15, fontWeight: 700, color: '#ffffff' }, children: recipientName })] }), _jsx(TradeAmountRow, { label: "You Exactly Pay:", tokenIcon: payTokenIcon, tokenSymbol: payTokenSymbol, tokenAddress: payTokenAddress, balanceText: "Balance: 0", onTokenPillClick: onPayTokenClick }), _jsx(TradeAmountRow, { label: "New Recipient Staked spCoins", tokenIcon: stakedTokenIcon, tokenSymbol: stakedTokenSymbol, tokenAddress: stakedTokenAddress, balanceText: "Sponsor Staked spCoins: 0", onTokenPillClick: onRecipientClick, onIconClick: onStakedRecipientIconClick, amount: sponsorAmount, onAmountChange: onSponsorAmountChange, amountDisabled: sponsorAmountBusy }), onSponsorSwapSubmit && (_jsx("button", { type: "button", onClick: onSponsorSwapSubmit, disabled: sponsorSwapBusy, style: {
                                width: '100%',
                                borderRadius: 8,
                                border: 'none',
                                background: '#243056',
                                color: sponsorSwapBusy ? '#475569' : '#7d8ec9',
                                fontSize: 12,
                                fontWeight: 600,
                                padding: '10px 0',
                                cursor: sponsorSwapBusy ? 'default' : 'pointer',
                                opacity: sponsorSwapBusy ? 0.6 : 1,
                            }, children: sponsorSwapBusy ? 'Swapping…' : 'Swap to spCoin' })), _jsx("button", { type: "button", onClick: onSubmit, style: {
                                width: '100%',
                                borderRadius: 8,
                                border: 'none',
                                background: '#243056',
                                color: '#7d8ec9',
                                fontSize: 12,
                                fontWeight: 600,
                                padding: '10px 0',
                                cursor: onSubmit ? 'pointer' : 'default',
                            }, children: submitLabel }), _jsx("div", { style: {
                                textAlign: 'left',
                                fontSize: 10,
                                color: '#64748b',
                                textDecoration: 'underline',
                                cursor: 'default',
                            }, children: "Fee Disclosures" })] }))] }) }));
}
