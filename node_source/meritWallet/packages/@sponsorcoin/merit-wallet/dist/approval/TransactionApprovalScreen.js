// File: src/approval/TransactionApprovalScreen.tsx
//
// 2026-11-22 (owner: "we need uniformity in processing"): the ONE approval screen every Merit wallet draws for a queued request, so a swap, a send or a spending approval looks and reads the same in the browser wallet, the stand-alone
// wallet and the extension (and the web app). A host hands it the request it is holding (the same ApprovalRequestInfo shape the vault's queue uses) and what to do on Approve / Reject; it works out the text (describeApproval), asks the
// chain for a gas estimate, and draws ApproveTransactionPanel (a swap or approval that names its tokens) or TransactionConfirmPanel (everything else: a plain send, a signature, a connect).
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { createPublicClient, formatEther, formatUnits, http } from 'viem';
import { ApproveTransactionPanel, TransactionConfirmPanel, AssetSelectDropDown, ASSET_SELECT_DISPLAY, TokenLogo } from '@sponsorcoin/spcoin-panels';
import { fitImageStyle } from '@sponsorcoin/spcoin-common/styles';
import { getNetworkConfiguration } from '@sponsorcoin/spcoin-feeds/networks';
import { loadAccountRecord, useExchangeContext } from '@sponsorcoin/spcoin-exchange-engine';
import { ensureAbsoluteAssetURL } from '../account/form/formHelpers';
import { describeApproval } from './transactionApproval';
const clients = new Map();
const clientFor = (rpcUrl) => {
    let client = clients.get(rpcUrl);
    if (!client) {
        client = createPublicClient({ transport: http(rpcUrl) });
        clients.set(rpcUrl, client);
    }
    return client;
};
/** An estimate from the chain for the request on screen, kept by id so a stale answer never shows under the next request. No estimate (the node cannot say, or the call would revert until an approval lands) shows no gas lines. */
function useGasEstimate(info, rpcUrl, nativeSymbol) {
    const [estimate, setEstimate] = useState(undefined);
    useEffect(() => {
        if (info.kind !== 'transaction' || !rpcUrl)
            return undefined;
        const d = (info.details ?? {});
        if (!d.from || !d.to)
            return undefined;
        let alive = true;
        const client = clientFor(rpcUrl);
        void Promise.all([
            client.estimateGas({ account: d.from, to: d.to, data: d.data, value: d.value !== undefined ? BigInt(d.value) : undefined }),
            client.getGasPrice().catch(() => undefined),
        ])
            .then(([gas, price]) => {
            if (!alive)
                return;
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
/** The account rows with each account's own icon (its saved record), looked up by address; rows the request already gave a logo for keep it. */
function useAccountsWithLogos(accounts) {
    const [found, setFound] = useState({});
    const key = (accounts ?? []).map((a) => a.address).join(',');
    useEffect(() => {
        let alive = true;
        for (const a of accounts ?? []) {
            if (!a.address)
                continue;
            void loadAccountRecord(a.address).then((rec) => {
                const r = (rec ?? {});
                const url = typeof r.logoURL === 'string' && r.logoURL ? ensureAbsoluteAssetURL(r.logoURL) : undefined;
                if (alive)
                    setFound((prev) => ({ ...prev, [a.address.toLowerCase()]: { logoURL: url, name: typeof r.name === 'string' ? r.name : undefined, symbol: typeof r.symbol === 'string' ? r.symbol : undefined } }));
            }).catch(() => undefined);
        }
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return accounts?.map((a) => { const f = found[a.address.toLowerCase()]; return { ...a, logoURL: a.logoURL ?? f?.logoURL, name: a.name ?? f?.name, symbol: a.symbol ?? f?.symbol }; });
}
const PILL_PARTS = ASSET_SELECT_DISPLAY.ICON | ASSET_SELECT_DISPLAY.SYMBOL | ASSET_SELECT_DISPLAY.NAME | ASSET_SELECT_DISPLAY.ADDRESS | ASSET_SELECT_DISPLAY.ADDR_COMP;
/** One display-only dropdown pill, the look the wallet header uses (no click, no chevron: an approval screen only shows what is being approved). */
function ApprovalPill({ rootId, icon, address, symbol, name, copy, parts = PILL_PARTS }) {
    return (_jsx(AssetSelectDropDown, { rootId: rootId, hasEntity: true, icon: icon, address: address, symbol: symbol, name: name, copyLabel: "Copy Address", showDisplay: parts | (copy ? ASSET_SELECT_DISPLAY.COPY : 0) }));
}
const imageIcon = (src) => (src ? _jsx("img", { src: src, alt: "", style: fitImageStyle }) : undefined);
export default function TransactionApprovalScreen({ info, nativeSymbol, rpcUrl, busy = false, onApprove, onReject }) {
    const view = describeApproval(info, nativeSymbol);
    const gas = useGasEstimate(info, rpcUrl, nativeSymbol);
    // the request's own account rows and the stake's account pills, each with its icon / name from the saved account record (one lookup for all of them)
    const accountPills = (view.pills ?? []).filter((p) => p.kind === 'account');
    const looked = useAccountsWithLogos([
        ...(view.accounts ?? []),
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
    const networkSlot = chainId !== undefined ? _jsx(ApprovalPill, { rootId: "APPROVAL_NETWORK", icon: imageIcon(cfg?.logoURL ? ensureAbsoluteAssetURL(cfg.logoURL) : undefined), address: String(chainId), symbol: cfg?.symbol || 'N/A', name: cfg?.name || 'Network' }) : undefined;
    const contractSlot = view.contractAddress && chainId !== undefined
        ? _jsx(ApprovalPill, { rootId: "APPROVAL_CONTRACT", icon: contractIsSpCoin || tokenCall ? _jsx(TokenLogo, { address: view.contractAddress, chainId: chainId, className: "", style: fitImageStyle }) : undefined, address: view.contractAddress, symbol: contractIsSpCoin ? 'spCoin' : undefined, name: contractIsSpCoin ? 'Sponsor Coin' : undefined, copy: true, parts: contractParts })
        : undefined;
    const accountSlot = first?.address ? _jsx(ApprovalPill, { rootId: "APPROVAL_ACCOUNT", icon: imageIcon(first.logoURL), address: first.address, symbol: first.symbol, name: first.name, copy: true }) : undefined;
    const pillRows = view.pills?.map((p) => {
        const account = p.kind === 'account' ? lookedPills?.find((a) => a.address.toLowerCase() === p.address.toLowerCase()) : undefined;
        const icon = p.kind === 'token' && chainId !== undefined ? _jsx(TokenLogo, { address: p.address, chainId: chainId, className: "", style: fitImageStyle }) : imageIcon(account?.logoURL ?? p.logoURL);
        return { label: p.label, value: p.value, node: _jsx(ApprovalPill, { rootId: "APPROVAL_PILL", icon: icon, address: p.address, symbol: account?.symbol ?? p.symbol, name: account?.name ?? p.name, copy: true }) };
    });
    if (view.approve) {
        const a = view.approve;
        return (_jsx(ApproveTransactionPanel, { title: view.title, accountAddress: a.from, method: a.method, contract: a.contract, sendToken: a.sendToken, receiveToken: a.receiveToken, chainId: view.chainId, amount: view.amount, estimateOut: a.estimateOut, gasLimit: gas?.limit, gasPrice: gas?.price, fee: gas?.fee, busy: busy, onApprove: () => onApprove(), onReject: onReject }));
    }
    return (_jsx(TransactionConfirmPanel, { title: view.title, message: view.method && view.message === view.method ? undefined : view.message, method: view.method, methodLabel: view.method === 'ERC20 Approve' ? 'Approve Method:' : 'Method:', accounts: accounts, tokens: view.tokens, amount: view.amount, amounts: view.amounts, chainId: view.chainId, contractAddress: view.contractAddress, networkSlot: networkSlot, pillRows: pillRows, contractSlot: contractSlot, accountSlot: accountSlot, busy: busy, embedded: true, onApprove: onApprove, onReject: onReject }));
}
