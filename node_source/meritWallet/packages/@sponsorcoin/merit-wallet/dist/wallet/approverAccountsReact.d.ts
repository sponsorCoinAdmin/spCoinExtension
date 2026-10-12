import type { AccountListGroup } from '@sponsorcoin/spcoin-panels';
import type { Wallet } from './wallet';
import { type ApproverController, type ApproverHost } from './approverAccounts';
export interface ApproverAccounts {
    groups: AccountListGroup[] | undefined;
    /** A failed connect, in words; empty when there is none. */
    notice: string;
    clearNotice: () => void;
    controller: ApproverController | undefined;
}
export declare function useApproverAccounts(wallet: Wallet | undefined, host: ApproverHost | undefined, activeAddress: string | undefined): ApproverAccounts;
