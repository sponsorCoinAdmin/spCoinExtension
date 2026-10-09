// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/sponsor/unstakeWalk.ts
//
// 2026-10-09 -- the Un-Stake walk of the web app's lib/spCoin/spCoinStaking.ts (unstakeSpCoin), with the same logic and the same leg order, and its two host-bound
// pieces injected: the contract WRITES (`send`: one transaction per leg, resolved once mined) and the contract READS (`read`). It unstakes at whatever level is
// fully specified, walking down to leaf agent-rate buckets (spending a shared `qty` budget) wherever a level is omitted or a partial quantity is requested.
// Only deleteAgentRate supports a true partial quantity on-chain; unSponsorRecipient / deleteRecipientRate(qty = 0) / unSponsorAgent are all-or-nothing, so those
// are used directly only when qty is omitted. Every leg is its own transaction, run in order; the walk stops at the first failure and the returned legs say
// exactly what happened. Pure TypeScript, tested with stubs (test/sponsor.test.mjs).
import { getAgentTransactionList, getRecipientRateAgentKeys, getRecipientStaked, getSponsorRecipientKeys, getSponsorRecipientRateKeys, throttleRead } from './sponsorReads';
function budgetExhausted(state) {
    return state.remainingQty !== undefined && state.remainingQty <= 0n;
}
async function runLeg(state, legMeta, amountRaw, send) {
    if (state.failed)
        return;
    state.touchedRecipients.add(legMeta.recipient);
    try {
        const tx = await send();
        const gasUsed = tx.gasUsed ?? 0n;
        const gasPriceRaw = tx.gasPrice ?? 0n;
        state.legs.push({ ...legMeta, amountRaw, txHash: tx.hash, gasUsed, gasPriceRaw, gasCostRaw: gasUsed * gasPriceRaw, status: 'ok' });
        if (state.remainingQty !== undefined)
            state.remainingQty -= amountRaw;
    }
    catch (error) {
        state.failed = true;
        state.legs.push({
            ...legMeta,
            amountRaw: 0n,
            txHash: '',
            gasUsed: 0n,
            gasPriceRaw: 0n,
            gasCostRaw: 0n,
            status: 'failed',
            error: String(error?.message ?? error),
        });
    }
}
function parseRaw(value) {
    try {
        return BigInt(String(value ?? '0').replace(/,/g, '').trim() || '0');
    }
    catch {
        return 0n;
    }
}
async function walkAgentLeaves(state, host, sponsor, recipient, rKey, agent) {
    const entries = await getAgentTransactionList(sponsor, recipient, rKey, agent, host.read);
    for (const entry of entries) {
        if (state.failed || budgetExhausted(state))
            return;
        const leafBalance = parseRaw(entry.stakedSPCoins);
        if (leafBalance <= 0n)
            continue;
        const amount = state.remainingQty < leafBalance ? state.remainingQty : leafBalance;
        if (amount <= 0n)
            continue;
        await runLeg(state, { recipient, rKey, agent, aKey: entry.agentRateKey, methodName: 'deleteAgentRate' }, amount, () => host.send('deleteAgentRate', [sponsor, recipient, rKey, agent, entry.agentRateKey, amount]));
    }
}
async function processAgent(state, host, sponsor, recipient, rKey, agent, aKey) {
    if (state.failed || budgetExhausted(state))
        return;
    if (aKey !== undefined) {
        const amount = state.remainingQty ?? 0n; // 0n => the contract's own "delete all" sentinel
        await runLeg(state, { recipient, rKey, agent, aKey, methodName: 'deleteAgentRate' }, amount, () => host.send('deleteAgentRate', [sponsor, recipient, rKey, agent, aKey, amount]));
        return;
    }
    if (state.remainingQty === undefined) {
        await runLeg(state, { recipient, rKey, agent, methodName: 'unSponsorAgent' }, 0n, () => host.send('unSponsorAgent', [sponsor, recipient, rKey, agent]));
        return;
    }
    await walkAgentLeaves(state, host, sponsor, recipient, rKey, agent);
}
async function processRateBucket(state, host, sponsor, recipient, rKey, agent, aKey) {
    if (state.failed || budgetExhausted(state))
        return;
    if (agent !== undefined) {
        await processAgent(state, host, sponsor, recipient, rKey, agent, aKey);
        return;
    }
    if (state.remainingQty === undefined) {
        await runLeg(state, { recipient, rKey, methodName: 'deleteRecipientRate' }, 0n, () => host.send('deleteRecipientRate', [sponsor, recipient, rKey, 0n]));
        return;
    }
    // Partial: the direct (non-agent) remainder first. deleteRecipientRate's quantity path never touches agent sub-records, so it cannot overdraw agent stake.
    const [bucketStaked, agentKeys] = await Promise.all([
        getRecipientStaked(sponsor, recipient, rKey, host.read),
        getRecipientRateAgentKeys(sponsor, recipient, rKey, host.read),
    ]);
    const agentTotals = await Promise.all(agentKeys.map((a) => getAgentTransactionList(sponsor, recipient, rKey, a, host.read)));
    const agentStaked = agentTotals.reduce((sum, entries) => sum + entries.reduce((s, e) => s + parseRaw(e.stakedSPCoins), 0n), 0n);
    const directRemainder = parseRaw(bucketStaked) - agentStaked;
    if (directRemainder > 0n && !budgetExhausted(state)) {
        const draw = state.remainingQty < directRemainder ? state.remainingQty : directRemainder;
        if (draw > 0n) {
            await runLeg(state, { recipient, rKey, methodName: 'deleteRecipientRate' }, draw, () => host.send('deleteRecipientRate', [sponsor, recipient, rKey, draw]));
        }
    }
    for (const a of agentKeys) {
        if (state.failed || budgetExhausted(state))
            return;
        await processAgent(state, host, sponsor, recipient, rKey, a, undefined);
    }
}
async function processRecipient(state, host, sponsor, recipient, rKey, agent, aKey) {
    if (state.failed || budgetExhausted(state))
        return;
    if (rKey === undefined && agent === undefined && aKey === undefined && state.remainingQty === undefined) {
        await runLeg(state, { recipient, rKey: '', methodName: 'unSponsorRecipient' }, 0n, () => host.send('unSponsorRecipient', [sponsor, recipient]));
        return;
    }
    if (rKey !== undefined) {
        await processRateBucket(state, host, sponsor, recipient, rKey, agent, aKey);
        return;
    }
    const rateKeys = await getSponsorRecipientRateKeys(sponsor, recipient, host.read);
    for (const rk of rateKeys) {
        if (state.failed || budgetExhausted(state))
            return;
        await processRateBucket(state, host, sponsor, recipient, rk, agent, aKey);
    }
}
export async function unstakeSpCoin(rawHost, sponsor, recipient, rKey, agent, aKey, qty) {
    // The walk's reads (the legs themselves are sent in order, one at a time) go through the throttle, so a long walk does not trip a node's rate limit.
    const host = { read: throttleRead(rawHost.read), send: rawHost.send };
    if (qty !== undefined && qty < 0n)
        throw new Error('Unstake quantity cannot be negative.');
    if (!sponsor)
        throw new Error('Unstaking needs a sponsor account.');
    const state = { legs: [], remainingQty: qty, failed: false, touchedRecipients: new Set() };
    if (recipient !== undefined) {
        await processRecipient(state, host, sponsor, recipient, rKey, agent, aKey);
    }
    else {
        const recipients = await getSponsorRecipientKeys(sponsor, host.read);
        for (const r of recipients) {
            if (state.failed || budgetExhausted(state))
                break;
            await processRecipient(state, host, sponsor, r, rKey, agent, aKey);
        }
    }
    const totalUnstakedRaw = state.legs.reduce((sum, leg) => sum + (leg.status === 'ok' ? leg.amountRaw : 0n), 0n);
    const totalGasCostRaw = state.legs.reduce((sum, leg) => sum + leg.gasCostRaw, 0n);
    const hasFailure = state.legs.some((leg) => leg.status === 'failed');
    const status = !hasFailure ? 'complete' : state.legs.some((leg) => leg.status === 'ok') ? 'partial' : 'failed';
    return { legs: state.legs, totalUnstakedRaw, totalGasCostRaw, legCount: state.legs.length, status };
}
