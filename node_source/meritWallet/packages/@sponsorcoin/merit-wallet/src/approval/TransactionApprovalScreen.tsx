// File: src/approval/TransactionApprovalScreen.tsx
//
// 2026-11-22 (owner: "we need uniformity in processing"): the ONE approval screen every Merit wallet draws for a queued request, so a swap, a send or a spending approval looks and reads the same in the browser wallet, the stand-alone
// wallet and the extension (and the web app). A host hands it the request it is holding (the same ApprovalRequestInfo shape the vault's queue uses) and what to do on Approve / Reject; it works out the text (describeApproval), asks the
// chain for a gas estimate, and draws TransactionConfirmPanel (a swap or approval with its token pills and gas lines, a plain send, a signature, a connect).
'use client';

import React, { useEffect, useState } from 'react';
import { createPublicClient, formatEther, formatUnits, http, type PublicClient } from 'viem';
import { TransactionConfirmPanel, AssetSelectDropDown, ASSET_SELECT_DISPLAY, TokenLogo } from '@sponsorcoin/spcoin-panels';
import { fitImageStyle } from '@sponsorcoin/spcoin-common/styles';
import { getNetworkConfiguration } from '@sponsorcoin/spcoin-feeds/networks';
import { loadAccountRecord, useExchangeContext } from '@sponsorcoin/spcoin-exchange-engine';
import { ensureAbsoluteAssetURL } from '../account/form/formHelpers';

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

type ShownAccount = { role: string; address: string; symbol?: string; name?: string; logoURL?: string };

/** The account rows with each account's own icon (its saved record), looked up by address; rows the request already gave a logo for keep it. */
function useAccountsWithLogos(accounts: ShownAccount[] | undefined): ShownAccount[] | undefined {
  const [found, setFound] = useState<Record<string, { logoURL?: string; name?: string; symbol?: string }>>({});
  const key = (accounts ?? []).map((a) => a.address).join(',');
  useEffect(() => {
    let alive = true;
    for (const a of accounts ?? []) {
      if (!a.address) continue;
      void loadAccountRecord(a.address).then((rec) => {
        const r = (rec ?? {}) as { logoURL?: unknown; name?: unknown; symbol?: unknown };
        const url = typeof r.logoURL === 'string' && r.logoURL ? ensureAbsoluteAssetURL(r.logoURL) : undefined;
        if (alive) setFound((prev) => ({ ...prev, [a.address.toLowerCase()]: { logoURL: url, name: typeof r.name === 'string' ? r.name : undefined, symbol: typeof r.symbol === 'string' ? r.symbol : undefined } }));
      }).catch(() => undefined);
    }
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return accounts?.map((a) => { const f = found[a.address.toLowerCase()]; return { ...a, logoURL: a.logoURL ?? f?.logoURL, name: a.name ?? f?.name, symbol: a.symbol ?? f?.symbol }; });
}

const PILL_PARTS = ASSET_SELECT_DISPLAY.ICON | ASSET_SELECT_DISPLAY.SYMBOL | ASSET_SELECT_DISPLAY.NAME | ASSET_SELECT_DISPLAY.ADDRESS | ASSET_SELECT_DISPLAY.ADDR_COMP;

/** One display-only dropdown pill, the look the wallet header uses (no click, no chevron: an approval screen only shows what is being approved). */
function ApprovalPill({ rootId, icon, address, symbol, name, copy, parts = PILL_PARTS }: { rootId: string; icon?: React.ReactNode; address: string; symbol?: string; name?: string; copy?: boolean; parts?: number }) {
  return (
    <AssetSelectDropDown
      rootId={rootId}
      hasEntity
      icon={icon}
      address={address}
      symbol={symbol}
      name={name}
      copyLabel="Copy Address"
      showDisplay={parts | (copy ? ASSET_SELECT_DISPLAY.COPY : 0)}
    />
  );
}

const imageIcon = (src?: string): React.ReactNode => (src ? <img src={src} alt="" style={fitImageStyle} /> : undefined);

export default function TransactionApprovalScreen({ info, nativeSymbol, rpcUrl, busy = false, onApprove, onReject }: TransactionApprovalScreenProps) {
  const view = describeApproval(info, nativeSymbol);
  const gas = useGasEstimate(info, rpcUrl, nativeSymbol);
  // the request's own account rows and the stake's account pills, each with its icon / name from the saved account record (one lookup for all of them)
  const accountPills = (view.pills ?? []).filter((p) => p.kind === 'account');
  const looked = useAccountsWithLogos([
    ...((view.accounts ?? []) as ShownAccount[]),
    ...accountPills.map((p) => ({ role: p.label, address: p.address, symbol: p.symbol, name: p.name, logoURL: p.logoURL })),
  ]);
  const accounts = looked?.slice(0, view.accounts?.length ?? 0);
  const lookedPills = looked?.slice(view.accounts?.length ?? 0);
  const { exchangeContext } = useExchangeContext();
  const spCoinAddress = exchangeContext?.settings?.spCoinContract?.address;
  const contractIsSpCoin = !!view.contractAddress && ((!!spCoinAddress && view.contractAddress.toLowerCase() === String(spCoinAddress).toLowerCase()) || /^claimOnChain/.test(view.method ?? ''));
  const chainId = typeof view.chainId === 'number' ? view.chainId : undefined;
  const cfg = chainId !== undefined ? getNetworkConfiguration(chainId) : undefined;
  const first = accounts?.[0];
  const tokenCall = view.method === 'ERC20 Approve' || view.method === 'ERC20 Transfer';
  const contractParts = (contractIsSpCoin ? ASSET_SELECT_DISPLAY.ICON | ASSET_SELECT_DISPLAY.SYMBOL | ASSET_SELECT_DISPLAY.NAME : tokenCall ? ASSET_SELECT_DISPLAY.ICON : 0) | ASSET_SELECT_DISPLAY.ADDRESS | ASSET_SELECT_DISPLAY.ADDR_COMP;
  const networkSlot = chainId !== undefined ? <ApprovalPill rootId="APPROVAL_NETWORK" icon={imageIcon(cfg?.logoURL ? ensureAbsoluteAssetURL(cfg.logoURL) : undefined)} address={String(chainId)} symbol={cfg?.symbol || 'N/A'} name={cfg?.name || 'Network'} /> : undefined;
  const contractSlot = view.contractAddress && chainId !== undefined
    ? <ApprovalPill rootId="APPROVAL_CONTRACT" icon={contractIsSpCoin || tokenCall ? <TokenLogo address={view.contractAddress} chainId={chainId} className="" style={fitImageStyle} /> : undefined} address={view.contractAddress} symbol={contractIsSpCoin ? 'spCoin' : undefined} name={contractIsSpCoin ? 'Sponsor Coin' : undefined} copy parts={contractParts} />
    : undefined;
  const accountSlot = first?.address ? <ApprovalPill rootId="APPROVAL_ACCOUNT" icon={imageIcon(first.logoURL)} address={first.address} symbol={first.symbol} name={first.name} copy /> : undefined;
  const pillRows = view.pills?.map((p) => {
    const account = p.kind === 'account' ? lookedPills?.find((a) => a.address.toLowerCase() === p.address.toLowerCase()) : undefined;
    const icon = p.kind === 'token' && chainId !== undefined ? <TokenLogo address={p.address} chainId={chainId} className="" style={fitImageStyle} /> : imageIcon(account?.logoURL ?? p.logoURL);
    return { label: p.label, value: p.value, node: <ApprovalPill rootId="APPROVAL_PILL" icon={icon} address={p.address} symbol={account?.symbol ?? p.symbol} name={account?.name ?? p.name} copy /> };
  });
  // a swap (or the spending approval before it) names its tokens: the same layout as every other approval (Account, Network, Contract, Method), then the Send and Receive token pills and the gas estimate
  const swap = view.approve;
  const swapIcon = (e: { logoURL?: string; symbol?: string; name?: string; address: string }) => <TokenLogo logoURL={e.logoURL} symbol={e.symbol} name={e.name} address={e.address} chainId={chainId} className="" style={fitImageStyle} />;
  const swapPill = (rootId: string, e: { logoURL?: string; symbol?: string; name?: string; address: string }) => <ApprovalPill rootId={rootId} icon={swapIcon(e)} address={e.address} symbol={e.symbol} name={e.name} copy />;
  const swapRows = swap
    ? [
        swap.sendToken ? { label: 'Send Token:', value: view.amount?.value, node: swapPill('APPROVAL_SEND', swap.sendToken) } : undefined,
        swap.receiveToken ? { label: 'Receive Token:', value: swap.estimateOut, node: swapPill('APPROVAL_RECEIVE', swap.receiveToken) } : undefined,
      ].filter((r): r is NonNullable<typeof r> => !!r)
    : undefined;
  const gasRows = swap && gas ? [{ label: 'Gas Limit:', value: gas.limit }, ...(gas.price ? [{ label: 'Gas Price:', value: gas.price }] : []), ...(gas.fee ? [{ label: 'Gas Fee:', value: gas.fee }] : [])] : undefined;
  return (
    <TransactionConfirmPanel
      title={view.title}
      message={swap || (view.method && view.message === view.method) ? undefined : view.message}
      method={swap ? swap.method : view.method}
      methodLabel={swap ? (swap.method.startsWith('ERC20 Approve') ? 'Approve Method:' : 'Method:') : view.method === 'ERC20 Approve' ? 'Approve Method:' : 'Method:'}
      accounts={accounts as never}
      tokens={swap ? undefined : (view.tokens as never)}
      amount={swap ? undefined : view.amount}
      amounts={view.amounts}
      chainId={view.chainId}
      contractAddress={view.contractAddress}
      networkSlot={networkSlot}
      pillRows={swapRows ?? pillRows}
      rows={gasRows}
      contractSlot={swap ? <ApprovalPill rootId="APPROVAL_CONTRACT" icon={swapIcon(swap.contract)} address={swap.contract.address} symbol={swap.contract.symbol} name={swap.contract.name} copy /> : contractSlot}
      accountSlot={accountSlot}
      busy={busy}
      embedded
      onApprove={onApprove}
      onReject={onReject}
    />
  );
}
