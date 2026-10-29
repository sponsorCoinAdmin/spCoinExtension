import { type ReactNode } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { ErrorMessage, MessageAccountEntry, MessageTokenEntry } from '@sponsorcoin/spcoin-common/context';
/**
 * 2026-10-29, on request ("it should be in the Message panel" — the
 * standalone Merit approval backdrop, ApprovalResponder.tsx, read as "out
 * of character" for the app) — when a Merit-authorized write needs a
 * person (a password, since "Mandatory Approval Required"'s own
 * Approve/Reject click was retired 2026-09-07 — the password prompt IS the
 * approval now), this panel shows the password field and Approve/Reject
 * buttons itself instead of a second, separately-styled overlay sitting on
 * top of everything. useMeritApprovalMessagePanel.ts (this package's own
 * replacement for ApprovalResponder.tsx) is what builds this prop and
 * drives it — see that hook's own doc comment for the full wiring.
 */
export interface MessagePanelPendingApproval {
    requirePassword: boolean;
    passwordError: string;
    /** True once Approve has been clicked and the real write is in flight — disables both controls, Approve reads "Signing…". */
    busy: boolean;
    onApprove: (password?: string) => void;
    onReject: () => void;
}
export interface MessagePanelRealProps {
    panelId?: SP_COIN_DISPLAY;
    errorMessage: ErrorMessage | undefined;
    renderAccountRow: (entry: MessageAccountEntry, index: number) => ReactNode;
    renderTokenRow: (entry: MessageTokenEntry, index: number) => ReactNode;
    /** Present only while a Merit-authorized write is actually waiting on a person. */
    pendingApproval?: MessagePanelPendingApproval | null;
}
export default function MessagePanelReal({ panelId, errorMessage, renderAccountRow, renderTokenRow, pendingApproval, }: MessagePanelRealProps): import("react").JSX.Element | null;
