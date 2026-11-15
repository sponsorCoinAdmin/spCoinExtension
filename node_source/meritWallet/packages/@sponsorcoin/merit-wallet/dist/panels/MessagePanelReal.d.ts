import React, { type ReactNode } from 'react';
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
    /** 2026-11-07: the words of the two buttons when a message is a question that is not a write ("Continue" / "Cancel"). Default Approve / Reject. */
    approveLabel?: string;
    rejectLabel?: string;
    /**
     * 2026-11-10 (docs/design/removeAccountPlan.txt X6): a private key the person may look at before deciding (the local Remove Account confirmation). The key is hidden (stars) behind a Show / Hide Private Key toggle; showing it calls this with the
     * typed password (the vault checks it again); it hides after KEY_SHOW_MS, and Copy warns about the clipboard.
     */
    revealKey?: (password: string) => Promise<string>;
    /** 2026-11-10 (owner): check boxes the person must tick before the approve button works; ticking one opens its popup (AcknowledgeDialog), which checks the box on acceptance and leaves it unchecked on Reject, Cancel or the X. */
    acknowledgements?: MessagePanelAcknowledgement[];
    /** 2026-11-11 (owner): the heading shown in the wallet's PANEL_TITLE (one line) while this message is up, instead of the screen's own title. */
    panelTitle?: string;
}
export interface MessagePanelAcknowledgement {
    id: string;
    /** The check box's words. */
    label: string;
    /** The popup's heading and body. */
    title: string;
    message: string;
    /** A line shown above the radio button (the account's native balance). */
    detail?: string;
    /** The toggle radio button's words ("I understand"); the accepting button stays dimmed until it is on. */
    choiceLabel: string;
    acceptLabel: string;
    rejectLabel: string;
}
/** How long a shown private key stays on screen (docs/design/removeAccountPlan.txt P1). */
export declare const KEY_SHOW_MS = 30000;
export interface MessagePanelRealProps {
    panelId?: SP_COIN_DISPLAY;
    errorMessage: ErrorMessage | undefined;
    renderAccountRow: (entry: MessageAccountEntry, index: number) => ReactNode;
    renderTokenRow: (entry: MessageTokenEntry, index: number) => ReactNode;
    /** Present only while a Merit-authorized write is actually waiting on a person. */
    pendingApproval?: MessagePanelPendingApproval | null;
}
export default function MessagePanelReal({ panelId, errorMessage, renderAccountRow, renderTokenRow, pendingApproval, }: MessagePanelRealProps): React.JSX.Element | null;
