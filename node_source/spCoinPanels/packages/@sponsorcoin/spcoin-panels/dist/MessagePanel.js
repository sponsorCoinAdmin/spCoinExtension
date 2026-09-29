// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MessagePanel.tsx
// Portable placeholder for MESSAGE_PANEL (2026-09-12) — the real app
// version (components/views/MessagePanel.tsx) reads a live `useErrorMessage()`
// (real ExchangeContext state), a `useSyncExternalStore`-backed wrap toggle
// (errorPanelDisplayStore), and renders MessageDetailsSection (real
// accounts/tokens/amount/gasFee breakdown) — none of which exist in a
// standalone consumer (the extension, today). Same shape (status-colored
// card, title, body text, optional source line), entirely inert — every
// prop optional with safe defaults, same "presentation only, no sync yet"
// scope every other extension-bound component here follows. Inline styles
// (no Tailwind), same reasoning as every sibling component; colors are the
// real app's own Tailwind palette values (statusStyles.ts), converted to
// their literal hex/rgba equivalents rather than approximated.
//
// MessageDetailsSection (the accounts/tokens/amount breakdown) and the
// unsupported-network special case are NOT ported — no real transaction/
// network data exists yet to break down; a future slice can add both once
// there's something real to feed them.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const STATUS_STYLES = {
    error: { border: 'rgba(239,68,68,0.4)', bg: 'rgba(127,29,29,0.2)', text: '#fee2e2' },
    warning: { border: '#f59e0b', bg: '#fde68a', text: '#451a03' },
    success: { border: 'rgba(34,197,94,0.4)', bg: 'rgba(20,83,45,0.2)', text: '#dcfce7' },
    info: { border: 'rgba(59,130,246,0.4)', bg: 'rgba(30,58,138,0.2)', text: '#dbeafe' },
    trace: { border: 'rgba(100,116,139,0.4)', bg: 'rgba(30,41,59,0.4)', text: '#e2e8f0' },
};
const DEFAULT_TITLES = {
    error: 'Something went wrong',
    warning: '', // real app shows no heading for warning — the title bar above it already says "Warning"
    success: 'Success',
    info: 'Notice',
    trace: 'Trace Debugging',
};
export default function MessagePanel({ kind = 'info', title, message = 'No message yet.', source, wrap = true, }) {
    const styles = STATUS_STYLES[kind];
    const resolvedTitle = title ?? DEFAULT_TITLES[kind];
    return (_jsxs("div", { role: kind === 'error' ? 'alert' : 'status', style: {
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            gap: 8,
            width: '100%',
            borderRadius: 12,
            padding: 12,
            border: `1px solid ${styles.border}`,
            background: styles.bg,
            color: styles.text,
        }, children: [resolvedTitle && (_jsx("h3", { style: { margin: 0, fontSize: 13, fontWeight: 600 }, children: resolvedTitle })), _jsx("p", { style: {
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.5,
                    whiteSpace: wrap ? 'pre-wrap' : 'pre',
                    overflowWrap: wrap ? 'break-word' : undefined,
                }, children: message }), source && (_jsxs("div", { style: { fontSize: 10, opacity: 0.8 }, children: [_jsx("span", { style: { fontWeight: 500 }, children: "Source:" }), " ", source] }))] }));
}
