// File: src/approval/transactionApproval.ts
//
// 2026-11-22 (owner: uniformity in processing): MOVED here from the browser wallet package so every Merit wallet (browser, stand-alone, extension, web) describes a request the same way. Originally 2026-11-19 -- what the browser approval screen says for one queued request (a transaction, a signature). Pure: no React, no panels, so it is tested under node. The screen itself is useBrowserApproval.ts.
// A request may carry `details.display`, the richer text the caller built for it (a swap's title, tokens and amount; the vault keeps it, never signs it). When it is there it wins over the plain "send X wei to Y" summary.
import { formatEther } from 'viem';
/** The first four bytes of the call data, named when they are a call this wallet knows; otherwise the selector itself. */
const METHODS = {
    '0x095ea7b3': 'ERC20 Approve',
    '0xa9059cbb': 'ERC20 Transfer',
    '0x04e45aaf': 'exactInputSingle',
    '0x414bf389': 'exactInputSingle',
    '0xb858183f': 'exactInput',
    '0xc04b8d59': 'exactInput',
    '0x5ae401dc': 'multicall',
    '0xac9650d8': 'multicall',
};
/** "14446.33 BRETT" out of the Receive row's detail text. */
function quotedOut(tokens) {
    const detail = tokens.find((x) => String(x.label ?? '').startsWith('Receive'))?.detail;
    const text = String(detail ?? '').split(' — ')[0].trim();
    return text || undefined;
}
const NATIVE_COIN = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
/**
 * What the Method row says. A call this wallet knows is named; for a swap on a named contract it reads "Uniswap V3 (exactInputSingle)", and when the coin being sold is a token (not the chain's own coin) the router must first be allowed to spend it, so the flow starts with an ERC20 approve:
 * "ERC20 Approve → Uniswap V3 (exactInputSingle)". Selling the chain's own coin has no approve step, so that prefix is never shown for it.
 */
export function methodLabel(method, contractSymbol, sellAddress, swapMethod) {
    if (method === 'ERC20 Approve' && contractSymbol && swapMethod)
        return `ERC20 Approve → ${contractSymbol} (${swapMethod})`;
    if (!contractSymbol || method === 'ERC20 Approve')
        return method;
    const swap = `${contractSymbol} (${method})`;
    const sellsToken = !!sellAddress && sellAddress.toLowerCase() !== NATIVE_COIN;
    return sellsToken ? `ERC20 Approve → ${swap}` : swap;
}
export function methodName(data) {
    if (!data || data === '0x')
        return 'Transfer';
    const selector = data.slice(0, 10).toLowerCase();
    return METHODS[selector] ?? `Contract call (${selector})`;
}
/**
 * 2026-11-22 (owner): a swap has no sender and no recipient, only the active account asking a contract to trade for it, and the contract is already shown on its own Contract line. So:
 *   - a request that brings its own account rows (a send's recipient, a sponsor's roles) keeps the sender plus those rows;
 *   - a contract call that brings none (a swap) shows the one account, "ACCOUNT", and nothing more (the contract is never listed as a recipient);
 *   - a plain transfer (no call data) is still sender and recipient.
 */
function transactionAccounts(d, shown, hasData) {
    const from = String(d.from ?? '');
    if (shown?.accounts)
        return [{ role: 'SENDER', address: from }, ...shown.accounts];
    if (hasData)
        return [{ role: 'ACCOUNT', address: from }];
    return [{ role: 'SENDER', address: from }, ...(d.to ? [{ role: 'RECIPIENT', address: d.to }] : [])];
}
export function describeApproval(info, nativeSymbol) {
    const d = (info.details ?? {});
    if (info.kind === 'transaction') {
        const shown = d.display;
        const hasData = !!d.data && d.data !== '0x';
        const tokenList = (shown?.tokens ?? []);
        const pick = (prefix) => {
            const t = tokenList.find((x) => String(x.label ?? '').startsWith(prefix));
            return t?.address ? { address: t.address, symbol: t.symbol, name: t.name, logoURL: t.logoURL } : undefined;
        };
        const contractAddress = shown?.contractAddress ?? (hasData ? d.to : undefined);
        const approve = shown && tokenList.length && contractAddress
            ? { from: String(d.from ?? ''), method: methodLabel(shown.method ?? methodName(d.data), shown.contractSymbol, pick('Sell')?.address, shown.swapMethod), contract: { address: contractAddress, symbol: shown.contractSymbol, name: shown.contractName }, sendToken: pick('Sell'), receiveToken: pick('Receive'), estimateOut: quotedOut(tokenList) }
            : undefined;
        return {
            // a request that brings its own text shows that; the plain summary is the fallback
            title: shown?.title ?? 'Transaction Request',
            message: shown?.message ?? info.summary,
            accounts: transactionAccounts(d, shown, hasData),
            tokens: shown?.tokens?.length ? shown.tokens : undefined,
            amount: shown?.amount ?? (d.value !== undefined && !hasData ? { label: 'Amount', value: `${formatEther(BigInt(d.value))} ${nativeSymbol}` } : undefined),
            chainId: d.chainId,
            contractAddress,
            approve,
        };
    }
    return {
        title: info.kind === 'sign' ? 'Signature Request' : 'Approval Request',
        message: d.message ? `${info.summary}\n\n${d.message}` : info.summary,
        accounts: d.address ? [{ role: 'SIGNER', address: d.address }] : undefined,
        chainId: d.chainId,
    };
}
