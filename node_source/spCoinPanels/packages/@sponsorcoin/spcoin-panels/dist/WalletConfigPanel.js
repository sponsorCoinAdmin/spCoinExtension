// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/WalletConfigPanel.tsx
// Portable placeholder for WALLET_CONFIG_PANEL (2026-09-12, revised
// 2026-09-14 on request — "look at the buffer spacing between the
// components" / missing text). The real app version
// (components/views/WalletConfig.tsx, 643 lines) reads/writes a dozen+
// real settings against live ExchangeContext state (password mode,
// cross-process sync mode, panel placement, exchange engine selection,
// etc.) — none of which exists in a standalone consumer (the extension,
// today). This ports the section SHAPE with representative option labels,
// entirely inert — no state, no real settings wired.
//
// 2026-09-14 revision, verified against the real component directly
// rather than approximated: outer spacing was `gap:10, padding:12` —
// the real container is `space-y-2` (8px) with NO outer padding at all
// (just a bottom pb-3); that stray padding pushed every section inward
// relative to the real layout. Each section card was `borderRadius:10,
// padding:10` uniform — real cards are `rounded-[15px]` with `px-5 py-3`
// (20px sides, 12px top/bottom), background `#161922` (was `#151b2e`,
// close but not exact). Password Protection was also missing its
// descriptive paragraph and the "Mandatory Password Required"/"All
// Transaction Approval Required" checkbox rows entirely — added back,
// matching the real copy verbatim, both checked (the real default is
// mandatorySecurity:false/mandatoryApproval:true, but the more common
// screen state — and this file's job is representative shape, not the
// real default — has both checked). Application Synchronization's own
// descriptive paragraph added too, for the same reason.
//
// 2026-09-14, on request ("why does the extension open button always open
// sponsorCoin.org and not localhost:3000") — one exception to this file's
// otherwise "entirely inert, no state, no real settings wired" rule: the
// "Options" section below IS real, live-wired, unlike every RadioRow/
// CheckboxRow elsewhere on this page (those stay decorative — no real
// state to back them yet). This one has a real consumer today (the Open
// button, via spCoinExtension/src/openApp.ts), so it's a genuine
// controlled `openTarget`/`onOpenTargetChange` prop pair instead of a
// fixed dot. Deliberately has no counterpart in the real app's own
// WalletConfig.tsx — Local/Prod is meaningless there (the web app IS
// whichever origin it's already running on); it only exists for a
// standalone consumer that opens a separate tab, like this extension.
'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WalletConfigPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const packageBuildTag_1 = require("./packageBuildTag");
const TabBodyMarker_1 = __importDefault(require("./TabBodyMarker"));
const DOT_ACTIVE = '#16a34a'; // green-600, matches the app's real active-option color
const DOT_INACTIVE = '#dc2626'; // red-600, matches the app's real inactive-option color
function RadioRow({ label, active }) {
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 12 }, children: [(0, jsx_runtime_1.jsx)("span", { style: {
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '9999px',
                    background: active ? DOT_ACTIVE : DOT_INACTIVE,
                } }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 11, fontWeight: active ? 700 : 400, color: active ? '#e2e8f0' : '#94a3b8' }, children: label })] }));
}
// Real, interactive counterpart to the decorative RadioRow above — used
// only by the Options section below (see this file's own header comment
// on why that section alone is live-wired).
function LiveRadioRow({ label, checked, onSelect, name, }) {
    return ((0, jsx_runtime_1.jsxs)("label", { style: { display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 12, cursor: 'pointer' }, children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: name, checked: checked, onChange: onSelect, style: { height: 12, width: 12, flexShrink: 0, accentColor: DOT_ACTIVE, cursor: 'pointer' } }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 11, fontWeight: checked ? 700 : 400, color: checked ? '#e2e8f0' : '#94a3b8' }, children: label })] }));
}
function CheckboxRow({ label, checked }) {
    return ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 12, fontWeight: 600, color: '#ffffff' }, children: label }), (0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: checked, readOnly: true, style: { height: 15, width: 15, flexShrink: 0, accentColor: '#5981F3' } })] }));
}
function ConfigSection({ title, children, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { style: { borderRadius: 15, border: '1px solid #1e293b', background: '#161922', padding: '10px 16px' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { display: 'block', fontSize: 13, fontWeight: 600, color: '#ffffff', marginBottom: 8 }, children: title }), children] }));
}
function WalletConfigPanel({ onLogoff, onResetPassword, openTarget = 'prod', onOpenTargetChange, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { style: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 12 }, children: [(0, jsx_runtime_1.jsx)(TabBodyMarker_1.default, { path: "WalletConfigPanel.tsx", build: packageBuildTag_1.PACKAGE_BUILD }), (0, jsx_runtime_1.jsxs)(ConfigSection, { title: "Password Protection", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(RadioRow, { label: "App", active: true }), (0, jsx_runtime_1.jsx)(RadioRow, { label: "Initial", active: false }), (0, jsx_runtime_1.jsx)(RadioRow, { label: "All", active: false }), (0, jsx_runtime_1.jsx)(RadioRow, { label: "Persisted", active: false })] }), (0, jsx_runtime_1.jsx)("p", { style: { marginTop: 8, fontSize: 10, color: '#94a3b8' }, children: "Merit Wallet locks behind a password every session \u2014 enter it once and every write for the rest of the session is approved without asking again. The current default." }), (0, jsx_runtime_1.jsx)(CheckboxRow, { label: "Mandatory Password Required", checked: true }), (0, jsx_runtime_1.jsx)(CheckboxRow, { label: "All Transaction Approval Required", checked: true }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 8, display: 'flex', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onLogoff, style: { flex: 1, borderRadius: 6, border: 'none', background: '#ca8a04', color: '#000', fontSize: 11, fontWeight: 600, padding: '6px 0', cursor: onLogoff ? 'pointer' : 'default' }, children: "Logoff" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onResetPassword, style: { flex: 1, borderRadius: 6, border: 'none', background: '#ca8a04', color: '#000', fontSize: 11, fontWeight: 600, padding: '6px 0', cursor: onResetPassword ? 'pointer' : 'default' }, children: "Reset Password" })] })] }), (0, jsx_runtime_1.jsxs)(ConfigSection, { title: "Options", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(LiveRadioRow, { name: "spcoin-open-target", label: "Local", checked: openTarget === 'local', onSelect: () => onOpenTargetChange === null || onOpenTargetChange === void 0 ? void 0 : onOpenTargetChange('local') }), (0, jsx_runtime_1.jsx)(LiveRadioRow, { name: "spcoin-open-target", label: "Prod", checked: openTarget === 'prod', onSelect: () => onOpenTargetChange === null || onOpenTargetChange === void 0 ? void 0 : onOpenTargetChange('prod') })] }), (0, jsx_runtime_1.jsx)("p", { style: { marginTop: 8, fontSize: 10, color: '#94a3b8' }, children: "Which site the Open button below the wallet opens \u2014 Local for http://localhost:3000, Prod for the real sponsorcoin.org." })] }), (0, jsx_runtime_1.jsxs)(ConfigSection, { title: "Application Synchronization", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(RadioRow, { label: "Authorize", active: false }), (0, jsx_runtime_1.jsx)(RadioRow, { label: "Enable", active: false }), (0, jsx_runtime_1.jsx)(RadioRow, { label: "Disable", active: true })] }), (0, jsx_runtime_1.jsx)("p", { style: { marginTop: 8, fontSize: 10, color: '#94a3b8' }, children: "The whole cross-process sync layer is off \u2014 no background pushes, no cross-session/cross-tab updates. Real writes (swap/stake/sponsor/send) are unaffected." })] }), (0, jsx_runtime_1.jsx)(ConfigSection, { title: "Merit Wallet Placement Location", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(RadioRow, { label: "Center", active: false }), (0, jsx_runtime_1.jsx)(RadioRow, { label: "Fixed", active: false }), (0, jsx_runtime_1.jsx)(RadioRow, { label: "Float", active: false }), (0, jsx_runtime_1.jsx)(RadioRow, { label: "Split Pane", active: false }), (0, jsx_runtime_1.jsx)(RadioRow, { label: "Top", active: true })] }) }), (0, jsx_runtime_1.jsx)(ConfigSection, { title: "Exchange Engine", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(RadioRow, { label: "Uniswap", active: true }), (0, jsx_runtime_1.jsx)(RadioRow, { label: "0X", active: false })] }) })] }));
}
