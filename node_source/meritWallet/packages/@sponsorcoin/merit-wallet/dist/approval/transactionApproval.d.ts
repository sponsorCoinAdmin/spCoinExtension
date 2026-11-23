import type { ApprovalRequestInfo } from '../vault/approvals';
export interface PillEntry {
    label: string;
    kind: 'token' | 'account';
    address: string;
    symbol?: string;
    name?: string;
    logoURL?: string;
    value?: string;
}
export interface ApprovalView {
    title: string;
    message: string;
    accounts?: Array<{
        role: string;
        address: string;
    }>;
    tokens?: unknown[];
    amount?: {
        label: string;
        value: string;
    };
    amounts?: Array<{
        label: string;
        value: string;
    }>;
    pills?: PillEntry[];
    chainId?: number;
    contractAddress?: string;
    /** The contract method, shown on its own left-justified Method row when the request names it. */
    method?: string;
    /** Set for a request that brings its own display with tokens (a swap): the browser wallet draws it with ApproveTransactionPanel. */
    approve?: ApproveView;
}
export interface ApproveEntry {
    address: string;
    symbol?: string;
    name?: string;
    logoURL?: string;
}
export interface ApproveView {
    from: string;
    method: string;
    contract: ApproveEntry;
    sendToken?: ApproveEntry;
    receiveToken?: ApproveEntry;
    /** The quoted amount out, e.g. "14446.33 BRETT" (from the Receive row's detail, "<amount> <symbol> — <address>"). */
    estimateOut?: string;
}
/**
 * What the Method row says. A call this wallet knows is named; for a swap on a named contract it reads "Uniswap V3 (exactInputSingle)", and when the coin being sold is a token (not the chain's own coin) the router must first be allowed to spend it, so the flow starts with an ERC20 approve:
 * "ERC20 Approve → Uniswap V3 (exactInputSingle)". Selling the chain's own coin has no approve step, so that prefix is never shown for it.
 */
export declare function methodLabel(method: string, contractSymbol: string | undefined, sellAddress: string | undefined, swapMethod?: string): string;
export declare function methodName(data?: string): string;
export declare function describeApproval(info: ApprovalRequestInfo, nativeSymbol: string): ApprovalView;
