import type { MessageAccountEntry, MessageAmountEntry, MessageTokenEntry } from './context';
export interface TradeExecutorDisplayMeta {
    label?: string;
    contractAddress?: string;
    tokens?: MessageTokenEntry[];
    amount?: MessageAmountEntry;
    accounts?: MessageAccountEntry[];
    title?: string;
    skipMandatoryApprovalGate?: boolean;
    interactive?: boolean;
    background?: boolean;
    manualAdvanceDebug?: boolean;
}
export interface TradeExecutionReceipt {
    blockNumber: bigint | number;
    gasUsed: bigint | string;
    gasPrice?: bigint | string | null;
    status: number | null;
    to: string | null;
    from: string;
    contractAddress: string | null;
    hash: string;
    logs: readonly unknown[];
}
export interface TradeExecutionResult {
    transactionHash: string;
    receipt: TradeExecutionReceipt | null;
}
export interface TradeExecutor {
    execute(params: {
        to: string;
        data: string;
        value?: string | bigint;
        chainId: number;
        rpcUrl: string;
        display?: TradeExecutorDisplayMeta;
    }): Promise<TradeExecutionResult>;
    call(params: {
        to: string;
        data: string;
        chainId: number;
        rpcUrl: string;
    }): Promise<string>;
}
export interface TradeExecutorAccount {
    address: string | undefined;
    isConnected: boolean;
    chainId: number;
}
export interface TradeExecutorContext {
    account: TradeExecutorAccount;
    executor: TradeExecutor;
}
