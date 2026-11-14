// File: src/rewards/estimateRewards.ts
//
// 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 25) -- the pending-reward ESTIMATE (estimateOffChainTotal / Sponsor / Recipient / AgentRewards) computed in the client from direct contract reads, so a host without
// the web app's run-script route (the extension) can show the Rewards tab's Pending amounts. It is a port of spcoin-access-modules' calculateClaimedRewards (the formulas, the three walks and the rounding are the same,
// with the Lab's caching / tracing left out): every staking bucket (sponsor -> recipient -> rate -> optional agent -> agent rate) holds totalStaked and a last-settled timestamp; its accrual is
// floor(floor(timeDiff * totalStaked * inflation / 100) / yearSeconds); that base splits recipientRate % to the Recipient+Agent pool (the rest is the Sponsor's) and agentRate / 1000 of the pool to the Agent.
// The reads are the contract's own views, through the same ChainRead the staking-tree reads use (named key / value arguments).
import type { ChainRead, TreeRecipient } from '../sponsor/sponsorReads';

const YEAR_SECONDS = 31556925n;

export interface PendingRewards {
  TYPE: '--ACCOUNT_PENDING_REWARDS--';
  accountKey: string;
  calculatedTimeStamp: string;
  annualInflation: string;
  pendingSponsorRewards: string;
  pendingRecipientRewards: string;
  pendingAgentRewards: string;
  /** Sum of the three roles (decimal string, raw base units). */
  pendingRewards: string;
  pendingTotalRewards: string;
  sponsorBucketStakedQuantity: string;
  recipientBucketStakedQuantity: string;
  agentBucketStakedQuantity: string;
}

const big = (value: unknown): bigint => {
  const text = String(value ?? '0').replace(/,/g, '').trim();
  if (!text) return 0n;
  try {
    return BigInt(text);
  } catch {
    return 0n;
  }
};

const list = (value: unknown): string[] => (Array.isArray(value) ? value.map((v) => String(v ?? '').trim()).filter(Boolean) : []);

/** floor(floor(timeDiff * totalStaked * rate / 100) / yearSeconds); a last-update in the future counts as zero elapsed time. */
export function accrue(totalStaked: unknown, lastUpdate: unknown, now: bigint, inflation: bigint): bigint {
  const last = big(lastUpdate);
  const diff = last > now ? 0n : now - last;
  return (diff * big(totalStaked) * inflation) / 100n / YEAR_SECONDS;
}

/** The sponsor keeps (100 - recipientRate) % of the base; the rest is the Recipient+Agent pool. */
export function splitRewardPool(base: bigint, recipientRate: unknown): { recipientAgentPool: bigint; sponsorReward: bigint } {
  const recipientAgentPool = (base * big(recipientRate)) / 100n;
  return { recipientAgentPool, sponsorReward: base - recipientAgentPool };
}

/** The agent gets agentRate / 1000 of the pool (at most 10 % when agentRate is 100); the recipient the remainder. */
export function splitAgentPool(pool: bigint, agentRate: unknown): { agentReward: bigint; recipientReward: bigint } {
  const agentReward = (pool * big(agentRate)) / 1000n;
  return { agentReward, recipientReward: pool - agentReward };
}

interface SetRecord {
  inserted: boolean;
  totalStaked: string;
  lastUpdate: string;
}

const readSet = async (read: ChainRead, setKey: unknown): Promise<SetRecord> => {
  const raw = (await read('getRateTransactionSet', [{ key: 'Set Key', value: String(setKey) }])) as Record<string, unknown> | unknown[] | null;
  const get = (name: string, index: number) => (Array.isArray(raw) ? raw[index] : (raw as Record<string, unknown> | null)?.[name]);
  const inserted = Boolean(get('inserted', 6));
  return {
    inserted,
    totalStaked: inserted ? String(get('totalStaked', 4) ?? '0') : '0',
    // The contract names this slot rewardsSettledThroughTimeStamp (older ABIs: lastUpdateTimeStamp).
    lastUpdate: inserted ? String(get('rewardsSettledThroughTimeStamp', 3) ?? get('lastUpdateTimeStamp', 3) ?? '0') : '0',
  };
};

export interface EstimateRewardsParams {
  read: ChainRead;
  accountKey: string;
  /** Seconds since the epoch to estimate at (default: now). The access module's timestampOverride. */
  now?: number | bigint;
}

export async function estimatePendingRewards({ read, accountKey, now }: EstimateRewardsParams): Promise<PendingRewards> {
  const currentTimeStamp = big(now ?? Math.floor(Date.now() / 1000));
  let annualInflation = 10n;
  try {
    annualInflation = big(await read('getInflationRate', []));
  } catch {
    // The access module falls back to 10 % when the inflation rate cannot be read.
  }

  const pending = { sponsor: 0n, recipient: 0n, agent: 0n, sponsorStaked: 0n, recipientStaked: 0n, agentStaked: 0n };
  const sponsorKeysOf = async (key: string) => list(await read('getSponsorKeys', [{ key: 'Account Key', value: key }]));
  const recipientKeysOf = async (key: string) => list(await read('getRecipientKeys', [{ key: 'Sponsor Key', value: key }]));
  const parentRecipientKeysOf = async (key: string) => list(await read('getParentRecipientKeys', [{ key: 'Account Key', value: key }]));
  const safeList = async (fn: () => Promise<unknown>): Promise<string[]> => {
    try {
      return list(await fn());
    } catch {
      return [];
    }
  };
  const recipientRates = (sponsor: string, recipient: string) =>
    safeList(() => read('getSponsorRecipientRates', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }]));
  const rateAgents = (sponsor: string, recipient: string, rate: string) =>
    safeList(() => read('getRecipientRateAgentList', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }, { key: 'Recipient Rate Key', value: rate }]));
  const agentRates = (sponsor: string, recipient: string, rate: string, agent: string) =>
    safeList(() => read('getAgentRateList', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }, { key: 'Recipient Rate Key', value: rate }, { key: 'Agent Key', value: agent }]));

  const recipientSet = async (sponsor: string, recipient: string, rate: string) =>
    readSet(read, await read('getRecipientRateTransactionSetKey', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }, { key: 'Recipient Rate Key', value: rate }]));
  const agentSet = async (sponsor: string, recipient: string, rate: string, agent: string, agentRate: string) =>
    readSet(
      read,
      await read('getAgentRateTransactionSetKey', [
        { key: 'Sponsor Key', value: sponsor },
        { key: 'Recipient Key', value: recipient },
        { key: 'Recipient Rate Key', value: rate },
        { key: 'Agent Key', value: agent },
        { key: 'Agent Rate Key', value: agentRate },
      ]),
    );

  // One (sponsor, recipient) pair: every rate bucket and every agent bucket under it, credited to the role `as` that `accountKey` plays in the pair.
  const walkPair = async (sponsor: string, recipient: string, as: 'sponsor' | 'recipient', agentFilter?: string) => {
    for (const rate of await recipientRates(sponsor, recipient)) {
      if (!agentFilter) {
        const set = await recipientSet(sponsor, recipient, rate);
        if (set.inserted) {
          const base = accrue(set.totalStaked, set.lastUpdate, currentTimeStamp, annualInflation);
          const { recipientAgentPool, sponsorReward } = splitRewardPool(base, rate);
          if (as === 'sponsor') {
            pending.sponsor += sponsorReward;
            pending.sponsorStaked += big(set.totalStaked);
          } else {
            pending.recipient += recipientAgentPool;
            pending.recipientStaked += big(set.totalStaked);
          }
        }
      }
      const agents = await rateAgents(sponsor, recipient, rate);
      for (const agent of agents) {
        if (agentFilter && agent.toLowerCase() !== agentFilter.toLowerCase()) continue;
        for (const agentRate of await agentRates(sponsor, recipient, rate, agent)) {
          const set = await agentSet(sponsor, recipient, rate, agent, agentRate);
          if (!set.inserted) continue;
          const base = accrue(set.totalStaked, set.lastUpdate, currentTimeStamp, annualInflation);
          const { recipientAgentPool, sponsorReward } = splitRewardPool(base, rate);
          const { agentReward, recipientReward } = splitAgentPool(recipientAgentPool, agentRate);
          if (agentFilter) {
            pending.agent += agentReward;
            pending.agentStaked += big(set.totalStaked);
          } else if (as === 'sponsor') {
            pending.sponsor += sponsorReward;
            pending.sponsorStaked += big(set.totalStaked);
          } else {
            pending.recipient += recipientReward;
            pending.recipientStaked += big(set.totalStaked);
          }
        }
      }
    }
  };

  // Sponsor path: every recipient this account sponsors.
  for (const recipient of await recipientKeysOf(accountKey)) await walkPair(accountKey, recipient, 'sponsor');
  // Recipient path: every sponsor of this account.
  for (const sponsor of await sponsorKeysOf(accountKey)) await walkPair(sponsor, accountKey, 'recipient');
  // Agent path: for every recipient this account is an agent of, every sponsor of that recipient, restricted to this account as the agent.
  for (const parent of await parentRecipientKeysOf(accountKey)) {
    for (const sponsor of await sponsorKeysOf(parent)) await walkPair(sponsor, parent, 'recipient', accountKey);
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
export async function estimateRewardsByMethod(method: string, params: EstimateRewardsParams): Promise<PendingRewards> {
  if (!/^estimateOffChain(Total|Sponsor|Recipient|Agent)Rewards$/.test(method)) throw new Error(`${method} is not an estimate method.`);
  return estimatePendingRewards(params);
}

/**
 * 2026-11-14 (owner: the Claim list shows each row's pending reward beside its staked amount): fills in, for every bucket of a staking tree, the reward it has earned so far for the role being claimed, with the same formulas as
 * estimatePendingRewards (so the rows add up to the Pending amount on the Rewards page). In the tree, recipientKey is the row's account: the recipient when role is Sponsor (the account sponsors them), the sponsor when
 * role is Recipient (the account is the recipient). The bucket's own stake gets pendingDirect; each agent-rate leaf gets pending. Sponsor claims count the sponsor's share of every bucket; Recipient claims count the
 * recipient's share (the whole Recipient+Agent pool of a direct bucket, the pool less the agent's cut for an agent bucket). Agent trees merge buckets across recipients, so they are not supported here.
 * It returns a function that recomputes every figure for a later time from what was read (the stakes and reward clocks do not change between claims), so Auto Refresh can tick the amounts without reading the chain again.
 */
export async function addPendingToTree(role: 'Sponsor' | 'Recipient', account: string, tree: TreeRecipient[], read: ChainRead, now?: number | bigint): Promise<(at?: number | bigint) => void> {
  let annualInflation = 10n;
  try {
    annualInflation = big(await read('getInflationRate', []));
  } catch {
    // Same fallback as the estimate: 10 % when the rate cannot be read.
  }
  // What each figure needs to be recomputed: its stake, its last-settled time, and how it is split.
  const slots: ((at: bigint) => void)[] = [];
  await Promise.all(
    tree.map(async (node) => {
      const sponsor = role === 'Sponsor' ? account : node.recipientKey;
      const recipient = role === 'Sponsor' ? node.recipientKey : account;
      await Promise.all(
        node.rates.map(async (rate) => {
          const rateKey = rate.recipientRateKey;
          const setKey = await read('getRecipientRateTransactionSetKey', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }, { key: 'Recipient Rate Key', value: rateKey }]);
          const direct = await readSet(read, setKey);
          slots.push((at) => {
            let pending = 0n;
            if (direct.inserted) {
              const { recipientAgentPool, sponsorReward } = splitRewardPool(accrue(direct.totalStaked, direct.lastUpdate, at, annualInflation), rateKey);
              pending = role === 'Sponsor' ? sponsorReward : recipientAgentPool;
            }
            rate.pendingDirect = pending.toString();
          });
          for (const agent of rate.agents) {
            for (const leaf of agent.rates) {
              const agentSetKey = await read('getAgentRateTransactionSetKey', [
                { key: 'Sponsor Key', value: sponsor },
                { key: 'Recipient Key', value: recipient },
                { key: 'Recipient Rate Key', value: rateKey },
                { key: 'Agent Key', value: agent.agentKey },
                { key: 'Agent Rate Key', value: leaf.agentRateKey },
              ]);
              const set = await readSet(read, agentSetKey);
              slots.push((at) => {
                if (!set.inserted) {
                  leaf.pending = '0';
                  return;
                }
                const { recipientAgentPool, sponsorReward } = splitRewardPool(accrue(set.totalStaked, set.lastUpdate, at, annualInflation), rateKey);
                const { recipientReward } = splitAgentPool(recipientAgentPool, leaf.agentRateKey);
                leaf.pending = (role === 'Sponsor' ? sponsorReward : recipientReward).toString();
              });
            }
          }
        }),
      );
    }),
  );
  const apply = (at?: number | bigint) => {
    const when = big(at ?? Math.floor(Date.now() / 1000));
    for (const slot of slots) slot(when);
  };
  apply(now);
  return apply;
}
