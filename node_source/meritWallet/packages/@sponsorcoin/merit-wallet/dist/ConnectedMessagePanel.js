// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/ConnectedMessagePanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, row 8 / S2b-4b) -- the message panel (MESSAGE_PANEL), wired to the exchange engine, written
// once for both hosts. The card itself is spcoin-panels' MessagePanelReal; what the web app's components/views/MessagePanel.tsx added was
// reading the current error message from the exchange context and filling the account / token row slots. This is that wiring, moved: the
// message comes from the engine's useExchangeContext (the same field the web hook useErrorMessage reads; the hook's only extras were a
// dedupe on write and a debug trace, neither used by a reader).
//
// Rows: a host may pass its own renderers (the web app passes rows built on its click-through account pill and token logo). Without them
// the package renders plain rows: the token row is the web app's MessageTokenRow, unchanged (it only uses the package TokenLogo); the
// account row is a simple avatar + "ROLE: symbol | name" + address line, since the web pill's click behaviour is web-only.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { messageRowStyle } from '@sponsorcoin/spcoin-common/styles';
import { useExchangeContext } from '@sponsorcoin/spcoin-exchange-engine';
import { MessageAccountRow, TokenLogo } from '@sponsorcoin/spcoin-panels';
import { MessagePanelReal } from './panels';
/** The web app's MessageTokenRow, unchanged. */
function DefaultTokenRow({ entry }) {
    return (_jsxs("div", { style: messageRowStyle.tokenColumn, children: [_jsxs("div", { style: messageRowStyle.line, children: [_jsx(TokenLogo, { tokenContract: entry.token, className: "", style: messageRowStyle.tokenLogo }), _jsxs("span", { style: messageRowStyle.label, children: [_jsxs("span", { style: messageRowStyle.role, children: [entry.label, ":"] }), ' ', [entry.token.symbol, entry.token.name].filter(Boolean).join(': ')] })] }), entry.detail && _jsx("div", { style: messageRowStyle.detail, children: entry.detail })] }));
}
export default function ConnectedMessagePanel({ renderAccountRow, renderTokenRow }) {
    const { errorMessage } = useExchangeContext();
    return (_jsx(MessagePanelReal, { errorMessage: errorMessage, renderAccountRow: renderAccountRow ?? ((entry, i) => _jsx(MessageAccountRow, { entry: entry }, `${entry.role}-${i}`)), renderTokenRow: renderTokenRow ?? ((entry, i) => _jsx(DefaultTokenRow, { entry: entry }, `token-${i}`)) }));
}
