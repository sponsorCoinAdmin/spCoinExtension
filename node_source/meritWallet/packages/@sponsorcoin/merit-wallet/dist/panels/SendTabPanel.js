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
import { PANEL_GAP } from '@sponsorcoin/spcoin-common/styles';
import { PACKAGE_BUILD } from '@sponsorcoin/spcoin-panels';
import { TabBodyMarker } from '@sponsorcoin/spcoin-panels';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { TradeAmountRow } from '@sponsorcoin/spcoin-panels';
import { PanelGate } from '@sponsorcoin/spcoin-panels';
import { SendButton } from '@sponsorcoin/spcoin-panels';
export default function SendTabPanel({ sendTokenSymbol, sendTokenAddress, sendTokenIcon, recipientSymbol, recipientAddress, recipientIcon, sendAmount, onSendAmountChange, onSubmit, submitBusy = false, balanceText = 'Balance: 0', recipientBalanceText, sendDecimals = 18, sendBalanceRaw, sendHasRecipient = false, sendSymbol = '', onSendTokenClick, onRecipientClick, }) {
    return (_jsxs("div", { style: { position: 'relative', display: 'flex', flexDirection: 'column', gap: PANEL_GAP }, children: [_jsx(TabBodyMarker, { path: "SendTabPanel.tsx", build: PACKAGE_BUILD }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.SEND_SELECT_PANEL, children: _jsx(TradeAmountRow, { label: "You Send", tokenIcon: sendTokenIcon, tokenSymbol: sendTokenSymbol, tokenAddress: sendTokenAddress, balanceText: balanceText, onTokenPillClick: onSendTokenClick, amount: sendAmount, onAmountChange: onSendAmountChange, amountDisabled: submitBusy }) }), _jsx(TradeAmountRow, { label: "Recipient", emptyPillLabel: "Select Recipient", balanceText: recipientBalanceText, tokenIcon: recipientIcon, tokenSymbol: recipientSymbol, tokenAddress: recipientAddress, onTokenPillClick: onRecipientClick }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.SEND_BUTTON, children: _jsx(SendButton, { id: "SEND_BUTTON_ACTION", amount: sendAmount ?? '', decimals: sendDecimals, balanceRaw: sendBalanceRaw, hasRecipient: sendHasRecipient, symbol: sendSymbol, isPending: submitBusy, onSend: () => onSubmit?.() }) })] }));
}
