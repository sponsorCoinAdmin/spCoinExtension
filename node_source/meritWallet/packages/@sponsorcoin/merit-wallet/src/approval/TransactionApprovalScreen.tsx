// File: src/approval/TransactionApprovalScreen.tsx
//
// 2026-11-22 (owner: "we need uniformity in processing"): the ONE approval screen every Merit wallet draws for a queued request, so a swap, a send or a spending approval looks and reads the same in the browser wallet, the stand-alone
// wallet and the extension (and the web app). A host hands it the request it is holding (the same ApprovalRequestInfo shape the vault's queue uses) and what to do on Approve / Reject; it works out the text (describeApproval), asks the
// chain for a gas estimate, and draws ApproveTransactionPanel (a swap or approval that names its tokens) or TransactionConfirmPanel (everything else: a plain send, a signature, a connect).
'use client';

import React, { useEffect, useState } from 'react';
import { createPublicClient, formatEther, formatUnits, http, type PublicClient } from 'viem';
import { ApproveTransactionPanel, TransactionConfirmPanel } from '@sponsorcoin/spcoin-panels';
import type { ApprovalRequestInfo } from '../vault/approvals';
import { describeApproval } from './transactionApproval';

export interface TransactionApprovalScreenProps {
  info: ApprovalRequestInfo;
  nativeSymbol: string;
  /** The chain's endpoint, for the gas estimate. Without one no gas lines are drawn. */
  rpcUrl?: string;
  busy?: boolean;
  onApprove: (password?: string) => void;
  onReject: () => void;
}

const clients = new Map<string, PublicClient>();
const clientFor = (rpcUrl: string): PublicClient => {
  let client = clients.get(rpcUrl);
  if (!client) {
    client = createPublicClient({ transport: http(rpcUrl) }) as PublicClient;
    clients.set(rpcUrl, client);
  }
  return client;
};

interface GasEstimate { id: string; limit: string; price?: string; fee?: string }

/** An estimate from the chain for the request on screen, kept by id so a stale answer never shows under the next request. No estimate (the node cannot say, or the call would revert until an approval lands) shows no gas lines. */
function useGasEstimate(info: ApprovalRequestInfo, rpcUrl: string | undefined, nativeSymbol: string): GasEstimate | undefined {
  const [estimate, setEstimate] = useState<GasEstimate | undefined>(undefined);
  useEffect(() => {
    if (info.kind !== 'transaction' || !rpcUrl) return undefined;
    const d = (info.details ?? {}) as { from?: string; to?: string; data?: string; value?: string };
    if (!d.from || !d.to) return undefined;
    let alive = true;
    const client = clientFor(rpcUrl);
    void Promise.all([
      client.estimateGas({ account: d.from as `0x${string}`, to: d.to as `0x${string}`, data: d.data as `0x${string}` | undefined, value: d.value !== undefined ? BigInt(d.value) : undefined }),
      client.getGasPrice().catch(() => undefined),
    ])
      .then(([gas, price]) => {
        if (!alive) return;
        // the limit is in gas units; the fee is units x the node's gas price, in wei (the coin's smallest unit) and in the coin
        const fee = price !== undefined ? `${(gas * price).toString()} wei (about ${formatEther(gas * price)} ${nativeSymbol})` : undefined;
        setEstimate({ id: info.id, limit: `${gas.toLocaleString('en-US')} gas units (estimated)`, price: price !== undefined ? `${formatUnits(price, 9)} gwei` : undefined, fee });
      })
      .catch(() => undefined);
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.id, rpcUrl, nativeSymbol]);
  return estimate && estimate.id === info.id ? estimate : undefined;
}

export default function TransactionApprovalScreen({ info, nativeSymbol, rpcUrl, busy = false, onApprove, onReject }: TransactionApprovalScreenProps) {
  const view = describeApproval(info, nativeSymbol);
  const gas = useGasEstimate(info, rpcUrl, nativeSymbol);
  if (view.approve) {
    const a = view.approve;
    return (
      <ApproveTransactionPanel
        title={view.title}
        accountAddress={a.from}
        method={a.method}
        contract={a.contract}
        sendToken={a.sendToken}
        receiveToken={a.receiveToken}
        chainId={view.chainId}
        amount={view.amount}
        estimateOut={a.estimateOut}
        gasLimit={gas?.limit}
        gasPrice={gas?.price}
        fee={gas?.fee}
        busy={busy}
        onApprove={() => onApprove()}
        onReject={onReject}
      />
    );
  }
  return (
    <TransactionConfirmPanel
      title={view.title}
      message={view.message}
      accounts={view.accounts as never}
      tokens={view.tokens as never}
      amount={view.amount}
      chainId={view.chainId}
      contractAddress={view.contractAddress}
      busy={busy}
      embedded
      onApprove={onApprove}
      onReject={onReject}
    />
  );
}
