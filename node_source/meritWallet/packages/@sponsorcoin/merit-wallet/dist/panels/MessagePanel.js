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
import { walletColors, walletTints } from '@sponsorcoin/spcoin-common/styles';
const STATUS_STYLES = {
    error: { border: walletTints.oneOffErrorTint40, bg: walletTints.oneOffMaroonTint20, text: walletColors.oneOffErrorBg },
    warning: { border: walletColors.warning, bg: walletColors.oneOffWarningSoft, text: walletColors.oneOffBrown },
    success: { border: walletTints.oneOffGreenTint40, bg: walletTints.oneOffGreenForestTint20, text: walletColors.oneOffSuccessBg },
    info: { border: walletTints.oneOffBlueTint40, bg: walletTints.oneOffNavyTint20, text: walletColors.oneOffInfoBg },
    trace: { border: walletTints.oneOffSlateGrayTint40, bg: walletTints.oneOffSlateInkTint40, text: walletColors.textLight },
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
