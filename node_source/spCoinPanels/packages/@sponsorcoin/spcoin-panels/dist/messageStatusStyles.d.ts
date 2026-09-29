import { STATUS } from '@sponsorcoin/spcoin-common/context';
export type MessageStatusKind = 'error' | 'warning' | 'success' | 'info' | 'trace';
/**
 * Fixed suffix of the error the web app's getConnectedSigner.ts throws when
 * a Merit approval prompt is rejected (by its own Reject button, or by
 * closing the wallet window). classifyStatus uses this to recognize that
 * one specific rejection reason and render it as a Warning rather than an
 * Error, across every write-flow call site at once.
 */
export declare const MERIT_WRITE_REJECTED_SUFFIX = "was not approved via Merit Wallet.";
export declare const MESSAGE_STATUS_STYLES: Record<MessageStatusKind, {
    border: string;
    bg: string;
    text: string;
}>;
export declare function classifyMessageStatus(status: STATUS | undefined, msg?: string): MessageStatusKind;
