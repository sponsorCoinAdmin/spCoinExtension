import { createElement } from 'react';
import type { ApprovalController } from '../vault/approvals';
export interface ApprovalPage {
    title: string;
    element: ReturnType<typeof createElement>;
    onCancel: () => void;
}
/** The approval page for the first pending request, or undefined when none is waiting. `rpcUrl` lets the screen estimate gas. */
export declare function useApprovalPage(approvals: ApprovalController, nativeSymbol: string, rpcUrl?: string): ApprovalPage | undefined;
