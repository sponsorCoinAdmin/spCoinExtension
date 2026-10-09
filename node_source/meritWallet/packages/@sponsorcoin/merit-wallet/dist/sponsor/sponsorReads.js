// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/sponsor/sponsorReads.ts
//
// 2026-10-09 -- the sponsor-side contract views the Sponsor and Rewards screens need, written once over an injected read function. The web app's equivalents are
// getSponsorRecipientRateKeys / getRecipientTransactionRecord / getAgentTransactionList / getSponsorTree in lib/context/helpers/sponsorDiscovery.ts (run-script based);
// here a host supplies `read` (the extension answers straight from the chain's RPC, a web host could keep run-script), so no host imports and no ethers.
// Pure TypeScript: tested with a stub node (test/sponsor.test.mjs).
/**
 * A read function that never has more than `concurrency` reads in flight and retries a failed read (with a short growing pause): a staking tree is many small reads, and a
 * node behind a rate limiter answers a burst of them with "503 Service Temporarily Unavailable". Wrapping an already throttled read is harmless.
 */
export function throttleRead(read, options = {}) {
    const concurrency = Math.max(1, options.concurrency ?? 4);
    const retries = options.retries ?? 2;
    const pauseMs = options.pauseMs ?? 250;
    if (read.__throttled)
        return read;
    let active = 0;
    const waiting = [];
    const acquire = () => new Promise((resolve) => {
        if (active < concurrency) {
            active += 1;
            resolve();
        }
        else
            waiting.push(() => { active += 1; resolve(); });
    });
    const release = () => {
        active -= 1;
        waiting.shift()?.();
    };
    const throttled = async (method, args) => {
        await acquire();
        try {
            for (let attempt = 0;; attempt++) {
                try {
                    return await read(method, args);
                }
                catch (error) {
                    if (attempt >= retries)
                        throw error;
                    await new Promise((resolve) => setTimeout(resolve, pauseMs * (attempt + 1)));
                }
            }
        }
        finally {
            release();
        }
    };
    throttled.__throttled = true;
    return throttled;
}
function strings(value) {
    return Array.isArray(value) ? value.map((v) => String(v)) : [];
}
function record(value) {
    return value && typeof value === 'object' ? value : {};
}
export async function getSponsorRecipientKeys(sponsor, read) {
    return strings(await read('getRecipientKeys', [{ key: 'Account Key', value: sponsor }]));
}
export async function getSponsorRecipientRateKeys(sponsor, recipient, read) {
    return strings(await read('getSponsorRecipientRates', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }]));
}
export async function getRecipientRateAgentKeys(sponsor, recipient, rateKey, read) {
    return strings(await read('getRecipientRateAgentList', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }, { key: 'Recipient Rate Key', value: rateKey }]));
}
/** The staked amount of one (sponsor, recipient, rate) bucket, raw decimal string. */
export async function getRecipientStaked(sponsor, recipient, rateKey, read) {
    const rec = record(await read('getRecipientTransaction', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }, { key: 'Recipient Rate Key', value: rateKey }]));
    return String(rec.stakedSPCoins ?? '0');
}
/** Every agent-rate leaf of one agent inside a rate bucket, with its staked amount. */
export async function getAgentTransactionList(sponsor, recipient, rateKey, agent, read) {
    const agentRateKeys = strings(await read('getAgentRateList', [
        { key: 'Sponsor Key', value: sponsor },
        { key: 'Recipient Key', value: recipient },
        { key: 'Recipient Rate Key', value: rateKey },
        { key: 'Agent Key', value: agent },
    ]));
    return Promise.all(agentRateKeys.map(async (agentRateKey) => {
        const rec = record(await read('getAgentTransaction', [
            { key: 'Sponsor Key', value: sponsor },
            { key: 'Recipient Key', value: recipient },
            { key: 'Recipient Rate Key', value: rateKey },
            { key: 'Agent Key', value: agent },
            { key: 'Agent Rate Key', value: agentRateKey },
        ]));
        return { agentRateKey, stakedSPCoins: String(rec.stakedSPCoins ?? '0') };
    }));
}
/** The sponsor's whole staking tree: recipients -> rate buckets -> agents -> agent rates, each with its staked amount. */
export async function loadSponsorTree(sponsorKey, rawRead) {
    const sponsor = sponsorKey;
    const read = throttleRead(rawRead);
    const recipients = await getSponsorRecipientKeys(sponsor, read);
    return Promise.all(recipients.map(async (recipientKey) => {
        const rateKeys = await getSponsorRecipientRateKeys(sponsor, recipientKey, read);
        const rates = await Promise.all(rateKeys.map(async (recipientRateKey) => {
            const [stakedSPCoins, agentKeys] = await Promise.all([
                getRecipientStaked(sponsor, recipientKey, recipientRateKey, read),
                getRecipientRateAgentKeys(sponsor, recipientKey, recipientRateKey, read),
            ]);
            const agents = await Promise.all(agentKeys.map(async (agentKey) => ({ agentKey, rates: await getAgentTransactionList(sponsor, recipientKey, recipientRateKey, agentKey, read) })));
            return { recipientRateKey, stakedSPCoins, agents };
        }));
        return { recipientKey, rates };
    }));
}
/** What `sponsor` has staked with `recipient` across the pair's rate buckets (the web app's getStakedAmountForRecipient, without its cache). */
export async function getStakedRawForPair(sponsor, recipient, rawRead) {
    const read = throttleRead(rawRead);
    const rateKeys = await getSponsorRecipientRateKeys(sponsor, recipient, read);
    const amounts = await Promise.all(rateKeys.map((rateKey) => getRecipientStaked(sponsor, recipient, rateKey, read)));
    return amounts.reduce((sum, amount) => {
        try {
            return sum + BigInt(amount || '0');
        }
        catch {
            return sum;
        }
    }, 0n);
}
