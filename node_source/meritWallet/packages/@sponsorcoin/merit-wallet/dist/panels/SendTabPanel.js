// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SendTabPanel.tsx
// SEND_PANEL (2026-09-12) — real, portable shell. The real app's own version
// (components/views/RadioOverlayPanels/SendPanel.tsx -> SendComponent.tsx)
// reads a live sell-token contract/balance, a real recipient account, and posts
// a real ERC20 transfer; that ExchangeContext-bound logic stays in the caller.
// The extension IS a standalone consumer and now drives this shell for real:
// its MeritWallet.tsx renders this SendTabPanel with a live onSubmit wired to
// sendNativeMerit (native + ERC20, with `decimals` threaded from the token-list
// row through onSendSubmit per 2026-09-23 Stage 39) behind the always-explicit
// signAndSendMeritTransaction confirmation screen. So the shell is no longer
// inert — its submit path performs real, signed sends.
// Named SendTabPanel, not SendPanel, to avoid a same-named-different-shape
// export clash with the web app's own full SendPanel wrapper. Shell, not
// logic, per the original split decision — behavior is supplied by the caller
// via onSubmit/onRecipientClick/onSendTokenClick/onSendAmountChange.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PANEL_GAP, panelBoxStyle } from '@sponsorcoin/spcoin-common/styles';
import { PACKAGE_BUILD, TabBodyMarker, TradeAmountRow, PanelGate, SendButton } from '@sponsorcoin/spcoin-panels';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export default function SendTabPanel({ sendTokenSymbol, sendTokenAddress, sendTokenIcon, recipientSymbol, recipientAddress, recipientIcon, sendAmount, onSendAmountChange, onSubmit, submitBusy = false, balanceText = 'Balance: 0', recipientBalanceText, sendDecimals = 18, sendBalanceRaw, sendHasRecipient = false, sendSymbol = '', onSendTokenClick, onRecipientClick, }) {
    return (
    // 2026-09-14, on request ("spacing between SEND_SELECT_PANEL,
    // SEND_ADDRESS_HEADER_BAR and SEND_BUTTON... not the case in the swap
    // panel") — gap:8/padding:12 here were the same kind of invented,
    // never-tied-to-anything-real values TradingStationPanel.tsx's own
    // header comment already called out and fixed for that file. The real
    // app's SendComponent.tsx container is `gap-1` (4px, no explicit
    // padding of its own) — same TSP_TW.gap constant TradingStationPanel.tsx
    // matches.
    //
    // 2026-09-22 — `padding: 8` removed entirely (was itself still an
    // invented value, just matched to TradingStationPanel.tsx's OLD number
    // instead of a real one — this file's own comment above already says
    // the real SendComponent.tsx container has "no explicit padding of its
    // own"). No extension-only styling rule — see
    // docs/npmPanelDisplayIssue.md and docs/design/spcoinPackagesDesign.txt.
    //
    // 2026-09-22 — `gap` now reads PANEL_GAP from
    // @sponsorcoin/spcoin-common/styles instead of a hardcoded `4` — see
    // that file's own header comment; one shared source instead of a
    // separately hardcoded `4` in this file/TradingStationPanel.tsx/
    // SponsorshipPanel.tsx.
    _jsxs("div", { style: panelBoxStyle.stack(PANEL_GAP), children: [_jsx(TabBodyMarker, { path: "SendTabPanel.tsx", build: PACKAGE_BUILD }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.SEND_SELECT_PANEL, children: _jsx(TradeAmountRow, { label: "You Send", tokenIcon: sendTokenIcon, tokenSymbol: sendTokenSymbol, tokenAddress: sendTokenAddress, balanceText: balanceText, onTokenPillClick: onSendTokenClick, amount: sendAmount, onAmountChange: onSendAmountChange, amountDisabled: submitBusy }) }), _jsx(TradeAmountRow, { label: "Recipient", emptyPillLabel: "Select Recipient", balanceText: recipientBalanceText, tokenIcon: recipientIcon, tokenSymbol: recipientSymbol, tokenAddress: recipientAddress, onTokenPillClick: onRecipientClick }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.SEND_BUTTON, children: _jsx(SendButton, { id: "SEND_BUTTON_ACTION", amount: sendAmount ?? '', decimals: sendDecimals, balanceRaw: sendBalanceRaw, hasRecipient: sendHasRecipient, symbol: sendSymbol, isPending: submitBusy, onSend: () => onSubmit?.() }) })] }));
}
