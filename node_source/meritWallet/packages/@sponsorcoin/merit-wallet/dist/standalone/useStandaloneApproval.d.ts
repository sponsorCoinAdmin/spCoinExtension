import { createElement } from 'react';
import type { ApprovalController } from '../vault/approvals';
export interface StandaloneApprovalPage {
    title: string;
    element: ReturnType<typeof createElement>;
    onCancel: () => void;
}
/** The approval page for the first pending request, or undefined when none is waiting. */
export declare function useStandaloneApproval(approvals: ApprovalController, nativeSymbol: string): StandaloneApprovalPage | undefined;
