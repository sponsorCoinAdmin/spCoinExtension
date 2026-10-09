// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/sponsor/sponsorReads.ts
//
// 2026-10-09 -- the sponsor-side contract views the Sponsor and Rewards screens need, written once over an injected read function. The web app's equivalents are
// getSponsorRecipientRateKeys / getRecipientTransactionRecord / getAgentTransactionList / getSponsorTree in lib/context/helpers/sponsorDiscovery.ts (run-script based);
// here a host supplies `read` (the extension answers straight from the chain's RPC, a web host could keep run-script), so no host imports and no ethers.
// Pure TypeScript: tested with a stub node (test/sponsor.test.mjs).

/** One contract view: the method name and its positional arguments, as key/value pairs (the run-script step shape). */
export type ChainRead = (method: string, args: { key: string; value: string }[]) => Promise<unknown>;

/**
 * A read function that never has more than `concurrency` reads in flight and retries a failed read (with a short growing pause): a staking tree is many small reads, and a
 * node behind a rate limiter answers a burst of them with "503 Service Temporarily Unavailable". Wrapping an already throttled read is harmless.
 */
export function throttleRead(read: ChainRead, options: { concurrency?: number; retries?: number; pauseMs?: number } = {}): ChainRead {
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const retries = options.retries ?? 2;
  const pauseMs = options.pauseMs ?? 250;
  if ((read as ChainRead & { __throttled?: boolean }).__throttled) return read;
  let active = 0;
  const waiting: Array<() => void> = [];
  const acquire = () =>
    new Promise<void>((resolve) => {
      if (active < concurrency) {
        active += 1;
        resolve();
      } else waiting.push(() => { active += 1; resolve(); });
    });
  const release = () => {
    active -= 1;
    waiting.shift()?.();
  };
  const throttled: ChainRead = async (method, args) => {
    await acquire();
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          return await read(method, args);
        } catch (error) {
          if (attempt >= retries) throw error;
          await new Promise((resolve) => setTimeout(resolve, pauseMs * (attempt + 1)));
        }
      }
    } finally {
      release();
    }
  };
  (throttled as ChainRead & { __throttled?: boolean }).__throttled = true;
  return throttled;
}

export interface TreeAgentRate {
  agentRateKey: string;
  stakedSPCoins: string;
}
export interface TreeAgent {
  agentKey: string;
  rates: TreeAgentRate[];
}
export interface TreeRate {
  recipientRateKey: string;
  /** Raw base units, decimal string. */
  stakedSPCoins: string;
  agents: TreeAgent[];
}
export interface TreeRecipient {
  recipientKey: string;
  rates: TreeRate[];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export async function getSponsorRecipientKeys(sponsor: string, read: ChainRead): Promise<string[]> {
  return strings(await read('getRecipientKeys', [{ key: 'Account Key', value: sponsor }]));
}

export async function getSponsorRecipientRateKeys(sponsor: string, recipient: string, read: ChainRead): Promise<string[]> {
  return strings(await read('getSponsorRecipientRates', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }]));
}

export async function getRecipientRateAgentKeys(sponsor: string, recipient: string, rateKey: string, read: ChainRead): Promise<string[]> {
  return strings(
    await read('getRecipientRateAgentList', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }, { key: 'Recipient Rate Key', value: rateKey }]),
  );
}

/** The staked amount of one (sponsor, recipient, rate) bucket, raw decimal string. */
export async function getRecipientStaked(sponsor: string, recipient: string, rateKey: string, read: ChainRead): Promise<string> {
  const rec = record(
    await read('getRecipientTransaction', [{ key: 'Sponsor Key', value: sponsor }, { key: 'Recipient Key', value: recipient }, { key: 'Recipient Rate Key', value: rateKey }]),
  );
  return String(rec.stakedSPCoins ?? '0');
}

/** Every agent-rate leaf of one agent inside a rate bucket, with its staked amount. */
export async function getAgentTransactionList(sponsor: string, recipient: string, rateKey: string, agent: string, read: ChainRead): Promise<TreeAgentRate[]> {
  const agentRateKeys = strings(
    await read('getAgentRateList', [
      { key: 'Sponsor Key', value: sponsor },
      { key: 'Recipient Key', value: recipient },
      { key: 'Recipient Rate Key', value: rateKey },
      { key: 'Agent Key', value: agent },
    ]),
  );
  return Promise.all(
    agentRateKeys.map(async (agentRateKey) => {
      const rec = record(
        await read('getAgentTransaction', [
          { key: 'Sponsor Key', value: sponsor },
          { key: 'Recipient Key', value: recipient },
          { key: 'Recipient Rate Key', value: rateKey },
          { key: 'Agent Key', value: agent },
          { key: 'Agent Rate Key', value: agentRateKey },
        ]),
      );
      return { agentRateKey, stakedSPCoins: String(rec.stakedSPCoins ?? '0') };
    }),
  );
}

/** The sponsor's whole staking tree: recipients -> rate buckets -> agents -> agent rates, each with its staked amount. */
export async function loadSponsorTree(sponsorKey: string, rawRead: ChainRead): Promise<TreeRecipient[]> {
  const sponsor = sponsorKey;
  const read = throttleRead(rawRead);
  const recipients = await getSponsorRecipientKeys(sponsor, read);
  return Promise.all(
    recipients.map(async (recipientKey): Promise<TreeRecipient> => {
      const rateKeys = await getSponsorRecipientRateKeys(sponsor, recipientKey, read);
      const rates = await Promise.all(
        rateKeys.map(async (recipientRateKey): Promise<TreeRate> => {
          const [stakedSPCoins, agentKeys] = await Promise.all([
            getRecipientStaked(sponsor, recipientKey, recipientRateKey, read),
            getRecipientRateAgentKeys(sponsor, recipientKey, recipientRateKey, read),
          ]);
          const agents = await Promise.all(
            agentKeys.map(async (agentKey): Promise<TreeAgent> => ({ agentKey, rates: await getAgentTransactionList(sponsor, recipientKey, recipientRateKey, agentKey, read) })),
          );
          return { recipientRateKey, stakedSPCoins, agents };
        }),
      );
      return { recipientKey, rates };
    }),
  );
}

/** What `sponsor` has staked with `recipient` across the pair's rate buckets (the web app's getStakedAmountForRecipient, without its cache). */
export async function getStakedRawForPair(sponsor: string, recipient: string, rawRead: ChainRead): Promise<bigint> {
  const read = throttleRead(rawRead);
  const rateKeys = await getSponsorRecipientRateKeys(sponsor, recipient, read);
  const amounts = await Promise.all(rateKeys.map((rateKey) => getRecipientStaked(sponsor, recipient, rateKey, read)));
  return amounts.reduce<bigint>((sum, amount) => {
    try {
      return sum + BigInt(amount || '0');
    } catch {
      return sum;
    }
  }, 0n);
}
