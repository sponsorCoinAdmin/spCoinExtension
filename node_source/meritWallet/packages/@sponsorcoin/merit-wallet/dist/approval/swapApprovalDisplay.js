// File: src/approval/swapApprovalDisplay.ts
//
// 2026-11-22 (owner: "we need uniformity in processing"): what a swap's approval screen is told, written ONCE for every Merit wallet. The browser wallet, the stand-alone wallet and the extension each carried their own copy of this
// (a confirmCopy and a wrapper around the executor's execute), and the copies had drifted. A host now calls swapConfirmCopy with the approval-details request the shared swap flow hands its signer, and wraps its executor with
// withSwapApprovalDisplay; the swap, and the ERC20 approve sent before it, then reach the approval screen with the same title, contract, tokens, amounts and method.
/** The Uniswap V3 router the screen names: the contract the person is asking to trade for them. */
const CONTRACT_SYMBOL = 'Uniswap V3';
const CONTRACT_NAME = 'SwapRouter02';
/** What the confirmation screen shows for the swap, from the approval-details request the shared swap flow (runUniswapSwap) hands the signer. */
export function swapConfirmCopy(request, minReceived) {
    return {
        // a wrap / unwrap (coin <-> wrapped coin) names its own title and contract; a swap keeps the router's
        title: request?.title ?? 'Approve Uniswap V3 Swap',
        message: request?.swapMethod === 'deposit' || request?.swapMethod === 'withdraw' ? 'Exchanged 1:1, no pool and no price impact' : `Minimum received ${minReceived}`,
        amount: request?.amount,
        tokens: (request?.tokens ?? []).map((tk) => ({ label: tk.label, symbol: tk.token?.symbol, name: tk.token?.name, address: tk.token?.address, logoURL: tk.token?.logoURL, detail: tk.detail })),
        contractSymbol: request?.swapMethod === 'deposit' || request?.swapMethod === 'withdraw' ? request?.contractSymbol ?? CONTRACT_SYMBOL : CONTRACT_SYMBOL,
        contractName: request?.swapMethod === 'deposit' || request?.swapMethod === 'withdraw' ? request?.contractName ?? CONTRACT_NAME : CONTRACT_NAME,
    };
}
const APPROVE_LABEL = 'Uniswap V3 Approve';
const MULTI_HOP_LABEL = 'Uniswap V3 Multi-hop Swap';
/** The spender an ERC20 approve(spender, amount) names: the last 40 hex digits of the first 32-byte word after the selector. */
export function approveSpender(data) {
    return data && data.length >= 74 && data.slice(0, 10).toLowerCase() === '0x095ea7b3' ? `0x${data.slice(34, 74)}` : undefined;
}
/**
 * Wraps an executor's execute so the swap itself (label `swapLabel`) and the spending approval sent before it ('Uniswap V3 Approve') carry the swap's display: the title, the tokens and amounts, the router's name, and for the
 * approval the router as the Contract (read from the approve call) and the swap call that follows, so its Method names the whole flow ("ERC20 Approve → Uniswap V3 (exactInputSingle)").
 */
export function withSwapApprovalDisplay(inner, swapLabel, confirm) {
    const swapMethod = swapLabel === MULTI_HOP_LABEL ? 'exactInput' : 'exactInputSingle';
    return ((req) => {
        const label = req.display?.label;
        if (label !== swapLabel && label !== APPROVE_LABEL)
            return inner(req);
        const isApprove = label === APPROVE_LABEL;
        return inner({
            ...req,
            display: {
                ...req.display,
                title: confirm.title,
                label: confirm.message,
                contractSymbol: confirm.contractSymbol,
                contractName: confirm.contractName,
                amount: confirm.amount ?? req.display?.amount,
                tokens: confirm.tokens.length ? confirm.tokens : req.display?.tokens,
                ...(isApprove ? { contractAddress: approveSpender(req.data) ?? req.display?.contractAddress, swapMethod } : { swapStep: true }),
            },
        });
    });
}
