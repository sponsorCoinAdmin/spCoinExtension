const YEAR_SECONDS = 31556925n;
const big = (value) => {
    const text = String(value ?? '0').replace(/,/g, '').trim();
    if (!text)
        return 0n;
    try {
        return BigInt(text);
    }
    catch {
        return 0n;
    }
};
const list = (value) => (Array.isArray(value) ? value.map((v) => String(v ?? '').trim()).filter(Boolean) : []);
/** floor(floor(timeDiff * totalStaked * rate / 100) / yearSeconds); a last-update in the future counts as zero elapsed time. */
export function accrue(totalStaked, lastUpdate, now, inflation) {
    const last = big(lastUpdate);
    const diff = last > now ? 0n : now - last;
    return (diff * big(totalStaked) * inflation) / 100n / YEAR_SECONDS;
}
/** The sponsor keeps (100 - recipientRate) % of the base; the rest is the Recipient+Agent pool. */
export function splitRewardPool(base, recipientRate) {
    const recipientAgentPool = (base * big(recipientRate)) / 100n;
    return { recipientAgentPool, sponsorReward: base - recipientAgentPool };
}
/** The agent gets agentRate / 1000 of the pool (at most 10 % when agentRate is 100); the recipient the remainder. */
export function splitAgentPool(pool, agentRate) {
    const agentReward = (pool * big(agentRate)) / 1000n;
    return { agentReward, recipientReward: pool - agentReward };
}
const readSet = async (read, setKey) => {
    const raw = (await read('getRateTransactionSet', [{ key: 'Set Key', value: String(setKey) }]));
    const get = (name, index) => (Array.isArray(raw) ? raw[index] : raw?.[name]);
    const inserted = Boolean(get('inserted', 6));
    return {
        inserted,
        totalStaked: inserted ? String(get('totalStaked', 4) ?? '0') : '0',
        // The contract names this slot rewardsSettledThroughTimeStamp (older ABIs: lastUpdateTimeStamp).
        lastUpdate: inserted ? String(get('rewardsSettledThroughTimeStamp', 3) ?? get('lastUpdateTimeStamp', 3) ?? '0') : '0',
    };
};
export async function estimatePendingRewards({ read, accountKey, now }) {
    const currentTimeStamp = big(now ?? Math.floor(Date.now() / 1000));
    let annualInflation = 10n;
    try {
        annualInflation = big(await read('getInflationRate', []));
    }
    catch {
        // The access module falls back to 10 % when the inflation rate cannot be read.
    }
    const pending = { sponsor: 0n, recipient: 0n, agent: 0n, sponsorStaked: 0n, recipientStaked: 0n, agentStaked: 0n };
    const sponsorKeysOf = async (key) => list(await read('getSponsorKeys', [{ key: 'Account Key', value: key }]));
    const recipientKeysOf = async (key) => list(await read('getRecipientKeys', [{ key: 'Sponsor Key', value: key }]));
    const parentRecipientKeysOf = async (key) => list(await read('getParentRecipientKeys', [{ key: 'Account Key', value: key }]));
    const safeList = async (fn) => {
        try {
            return list(await fn());
        }
        catch {
            return [];
        }
    };
    const recipientRates = (sponsor, recipient) => safeList(() => read('getSponsorRecipientRates', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }]));
    const rateAgents = (sponsor, recipient, rate) => safeList(() => read('getRecipientRateAgentList', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }, { key: 'Recipient Rate Key', value: rate }]));
    const agentRates = (sponsor, recipient, rate, agent) => safeList(() => read('getAgentRateList', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }, { key: 'Recipient Rate Key', value: rate }, { key: 'Agent Key', value: agent }]));
    const recipientSet = async (sponsor, recipient, rate) => readSet(read, await read('getRecipientRateTransactionSetKey', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }, { key: 'Recipient Rate Key', value: rate }]));
    const agentSet = async (sponsor, recipient, rate, agent, agentRate) => readSet(read, await read('getAgentRateTransactionSetKey', [
        { key: 'Sponsor Key', value: sponsor },
        { key: 'Recipient Key', value: recipient },
        { key: 'Recipient Rate Key', value: rate },
        { key: 'Agent Key', value: agent },
        { key: 'Agent Rate Key', value: agentRate },
    ]));
    // One (sponsor, recipient) pair: every rate bucket and every agent bucket under it, credited to the role `as` that `accountKey` plays in the pair.
    const walkPair = async (sponsor, recipient, as, agentFilter) => {
        for (const rate of await recipientRates(sponsor, recipient)) {
            if (!agentFilter) {
                const set = await recipientSet(sponsor, recipient, rate);
                if (set.inserted) {
                    const base = accrue(set.totalStaked, set.lastUpdate, currentTimeStamp, annualInflation);
                    const { recipientAgentPool, sponsorReward } = splitRewardPool(base, rate);
                    if (as === 'sponsor') {
                        pending.sponsor += sponsorReward;
                        pending.sponsorStaked += big(set.totalStaked);
                    }
                    else {
                        pending.recipient += recipientAgentPool;
                        pending.recipientStaked += big(set.totalStaked);
                    }
                }
            }
            const agents = await rateAgents(sponsor, recipient, rate);
            for (const agent of agents) {
                if (agentFilter && agent.toLowerCase() !== agentFilter.toLowerCase())
                    continue;
                for (const agentRate of await agentRates(sponsor, recipient, rate, agent)) {
                    const set = await agentSet(sponsor, recipient, rate, agent, agentRate);
                    if (!set.inserted)
                        continue;
                    const base = accrue(set.totalStaked, set.lastUpdate, currentTimeStamp, annualInflation);
                    const { recipientAgentPool, sponsorReward } = splitRewardPool(base, rate);
                    const { agentReward, recipientReward } = splitAgentPool(recipientAgentPool, agentRate);
                    if (agentFilter) {
                        pending.agent += agentReward;
                        pending.agentStaked += big(set.totalStaked);
                    }
                    else if (as === 'sponsor') {
                        pending.sponsor += sponsorReward;
                        pending.sponsorStaked += big(set.totalStaked);
                    }
                    else {
                        pending.recipient += recipientReward;
                        pending.recipientStaked += big(set.totalStaked);
                    }
                }
            }
        }
    };
    // Sponsor path: every recipient this account sponsors.
    for (const recipient of await recipientKeysOf(accountKey))
        await walkPair(accountKey, recipient, 'sponsor');
    // Recipient path: every sponsor of this account.
    for (const sponsor of await sponsorKeysOf(accountKey))
        await walkPair(sponsor, accountKey, 'recipient');
    // Agent path: for every recipient this account is an agent of, every sponsor of that recipient, restricted to this account as the agent.
    for (const parent of await parentRecipientKeysOf(accountKey)) {
        for (const sponsor of await sponsorKeysOf(parent))
            await walkPair(sponsor, parent, 'recipient', accountKey);
    }
    const total = pending.sponsor + pending.recipient + pending.agent;
    return {
        TYPE: '--ACCOUNT_PENDING_REWARDS--',
        accountKey,
        calculatedTimeStamp: currentTimeStamp.toString(),
        annualInflation: annualInflation.toString(),
        pendingSponsorRewards: pending.sponsor.toString(),
        pendingRecipientRewards: pending.recipient.toString(),
        pendingAgentRewards: pending.agent.toString(),
        pendingRewards: total.toString(),
        pendingTotalRewards: total.toString(),
        sponsorBucketStakedQuantity: pending.sponsorStaked.toString(),
        recipientBucketStakedQuantity: pending.recipientStaked.toString(),
        agentBucketStakedQuantity: pending.agentStaked.toString(),
    };
}
/** The result of one estimate method, in the shape the run-script route returned (the Rewards panel's parsers read pending<Role>Rewards / pendingTotalRewards). */
export async function estimateRewardsByMethod(method, params) {
    if (!/^estimateOffChain(Total|Sponsor|Recipient|Agent)Rewards$/.test(method))
        throw new Error(`${method} is not an estimate method.`);
    return estimatePendingRewards(params);
}
