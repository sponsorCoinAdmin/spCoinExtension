// File: spCoinCommon/src/tradeExecutor.ts
//
// TradeExecutor interface and related types — shared between
// @sponsorcoin/spcoin-onchain (uses these types in its portable execution
// primitives) and @sponsorcoin/spcoin-exchange-engine (re-exports for
// backward-compatible public API). Defined here in spcoin-common to
// break the circular import that existed when onchain imported these
// types from the engine package (engine → onchain value re-export +
// onchain → engine type import created a circular .d.ts resolution
// chain that triggered TS5055 in both VS Code and tsc builds).

import type {
  MessageAccountEntry,
  MessageAmountEntry,
  MessageTokenEntry,
} from './context';

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
