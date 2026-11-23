// File: src/rewards/claimAmounts.ts
//
// 2026-11-23 (owner): what a reward claim will pay, worked out ONCE for every Merit wallet so the claim's approval screen shows the real amount (it used to show a hard-coded 0). The host hands over its chain reads and the chain's time;
// this returns the total as text and, for the Total claim, a line per role that has rewards (Sponsor, Recipient, Agent), which is what the approval screen draws above the total.
import { formatUnits } from 'viem';
import { estimateRewardsByMethod } from './estimateRewards';
const CLAIM_FIELD = {
    claimOnChainTotalRewards: 'pendingTotalRewards',
    claimOnChainSponsorRewards: 'pendingSponsorRewards',
    claimOnChainRecipientRewards: 'pendingRecipientRewards',
    claimOnChainAgentRewards: 'pendingAgentRewards',
};
/** 18-decimal base units as text with six decimals ("0.760260"). */
export function formatClaimAmount(wei) {
    const [whole, fraction = ''] = formatUnits(BigInt(wei || '0'), 18).split('.');
    return `${whole}.${fraction.padEnd(6, '0').slice(0, 6)}`;
}
/** What the claim `method` will pay for `accountKey`, from the same estimate the Rewards page shows. A failed estimate gives {} (the approval screen then draws no amount line, never a made-up 0). */
export async function claimAmountsFor(method, params) {
    const field = CLAIM_FIELD[method];
    if (!field)
        return {};
    try {
        const pending = await estimateRewardsByMethod('estimateOffChainTotalRewards', params);
        const roleAmounts = method === 'claimOnChainTotalRewards'
            ? [['Sponsor', pending.pendingSponsorRewards], ['Recipient', pending.pendingRecipientRewards], ['Agent', pending.pendingAgentRewards]]
                .filter(([, wei]) => BigInt(wei || '0') > 0n)
                .map(([label, wei]) => ({ label: `${label} Rewards:`, value: formatClaimAmount(wei) }))
            : undefined;
        return { amountText: formatClaimAmount(pending[field]), roleAmounts };
    }
    catch {
        return {};
    }
}
