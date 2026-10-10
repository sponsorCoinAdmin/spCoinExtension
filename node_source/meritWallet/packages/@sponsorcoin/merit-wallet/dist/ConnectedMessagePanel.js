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
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { useExchangeContext } from '@sponsorcoin/spcoin-exchange-engine';
import { AccountAvatar, TokenLogo } from '@sponsorcoin/spcoin-panels';
import { MessagePanelReal } from './panels';
const ROLE_TO_MODE = {
    SPONSOR: SP_COIN_DISPLAY.SPONSOR_ACCOUNT,
    RECIPIENT: SP_COIN_DISPLAY.RECIPIENT_ACCOUNT,
    AGENT: SP_COIN_DISPLAY.AGENT_ACCOUNT,
    ACCOUNT: SP_COIN_DISPLAY.ACTIVE_ACCOUNT,
};
function DefaultAccountRow({ entry }) {
    const label = [entry.account.symbol, entry.account.name].filter(Boolean).join(' | ');
    return (_jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AccountAvatar, { account: entry.account, mode: ROLE_TO_MODE[entry.role], roleLabel: entry.role, className: "h-8 w-8 rounded-full object-cover" }), _jsxs("span", { className: "text-sm", children: [_jsxs("span", { className: "font-semibold", children: [entry.role, ":"] }), " ", label] })] }), _jsx("div", { className: "pl-10 text-xs opacity-80 break-all", children: String(entry.account.address ?? '') }), entry.detail && _jsx("div", { className: "pl-10 text-xs opacity-80", children: entry.detail })] }));
}
/** The web app's MessageTokenRow, unchanged. */
function DefaultTokenRow({ entry }) {
    return (_jsxs("div", { className: "flex flex-col", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(TokenLogo, { tokenContract: entry.token, className: "h-8 w-8 rounded-full object-contain" }), _jsxs("span", { className: "text-sm", children: [_jsxs("span", { className: "font-semibold", children: [entry.label, ":"] }), ' ', [entry.token.symbol, entry.token.name].filter(Boolean).join(': ')] })] }), entry.detail && _jsx("div", { className: "pl-10 text-xs opacity-80", children: entry.detail })] }));
}
export default function ConnectedMessagePanel({ renderAccountRow, renderTokenRow }) {
    const { errorMessage } = useExchangeContext();
    return (_jsx(MessagePanelReal, { errorMessage: errorMessage, renderAccountRow: renderAccountRow ?? ((entry, i) => _jsx(DefaultAccountRow, { entry: entry }, `${entry.role}-${i}`)), renderTokenRow: renderTokenRow ?? ((entry, i) => _jsx(DefaultTokenRow, { entry: entry }, `token-${i}`)) }));
}
