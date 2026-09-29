// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/messageStatusStyles.ts
//
// 2026-09-22, real migration — promoted from the web app's
// components/views/MessagePanel/statusStyles.ts. Named MessageStatusKind/
// messageStatusStyles (not MessageKind/statusStyles) to avoid colliding
// with the existing, separate MessagePanel.tsx placeholder's own inline
// MessageKind type/STATUS_STYLES map (a deliberately different, standalone
// inline-style copy for the extension's inert placeholder) — same naming
// caution as MeritInfoPanelReal/ProcessFlowPanel/TransactionConfirmPanel.
// MERIT_WRITE_REJECTED_SUFFIX moved here too (zero dependencies of its own
// in the web app's lib/spCoin/meritWriteRejection.ts) since it exists
// solely to be shared with this file; the web app's own copy of both files
// are now re-export shims.
import { STATUS } from '@sponsorcoin/spcoin-common/context';
/**
 * Fixed suffix of the error the web app's getConnectedSigner.ts throws when
 * a Merit approval prompt is rejected (by its own Reject button, or by
 * closing the wallet window). classifyStatus uses this to recognize that
 * one specific rejection reason and render it as a Warning rather than an
 * Error, across every write-flow call site at once.
 */
export const MERIT_WRITE_REJECTED_SUFFIX = 'was not approved via Merit Wallet.';
// warning is deliberately a genuine LIGHT yellow card (dark text on a pale
// bg), not this app's usual dark-tinted treatment the other four kinds use —
// a real "you cancelled this, no action needed" banner should read as
// visually distinct from the ambient dark theme, not just a different hue
// of the same dark card.
export const MESSAGE_STATUS_STYLES = {
    error: { border: 'border-red-500/40', bg: 'bg-red-900/20', text: 'text-red-100' },
    warning: { border: 'border-amber-500', bg: 'bg-amber-200', text: 'text-amber-950' },
    success: { border: 'border-green-500/40', bg: 'bg-green-900/20', text: 'text-green-100' },
    info: { border: 'border-blue-500/40', bg: 'bg-blue-900/20', text: 'text-blue-100' },
    trace: { border: 'border-slate-500/40', bg: 'bg-slate-800/40', text: 'text-slate-200' },
};
export function classifyMessageStatus(status, msg) {
    if (status === STATUS.SUCCESS)
        return 'success';
    if (status === STATUS.INFO)
        return 'info';
    if (status === STATUS.WARNING)
        return 'warning';
    if (status === STATUS.TRACE_DEBUGGING)
        return 'trace';
    if (msg?.includes(MERIT_WRITE_REJECTED_SUFFIX))
        return 'warning';
    return 'error';
}
