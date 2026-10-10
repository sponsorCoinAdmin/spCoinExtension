// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/receipt/transactionReceipts.ts
//
// 2026-10-09 -- the result card (MESSAGE_PANEL content) of a confirmed or failed Send / Sponsor (stake) transaction, in the same format the web app's
// SendComponent and doStake build inline and the shared swap flow builds for Uniswap: "<what> confirmed.", the transaction hash, a flat summary
// (Contract, Method, Block, Gas Used), a dashed separator, the details (Status), the account rows, and the amount line. Pure functions; the wallet
// component shows the result through useTransactionReceipt (below the panel tree), so a host only has to report what happened.
import { MESSAGE_ACCOUNTS_MARKER, STATUS, type ErrorMessage, type MessageAccountEntry, type spCoinAccount } from '@sponsorcoin/spcoin-common/context';

/** What a host reports after a send / stake: the outcome only. */
export type HostTransactionResult =
  | { ok: true; hash: string; receipt?: { blockNumber?: bigint | number | string; gasUsed?: bigint | number | string; status?: number | null } | null; methodName?: string }
  | { ok: false; message: string };

/** A profile as the wallet shows it (the same fields as a list row). */
export interface ReceiptProfile {
  address?: string;
  name?: string;
  symbol?: string;
  logoURL?: string;
  /** A complete account record, when the host already has one (the web app does): used as it is instead of one built from the fields above. */
  account?: spCoinAccount;
}

/** The account record the message panel's row reads, from whatever profile the wallet has. */
export function toMessageAccount(profile: ReceiptProfile | undefined): spCoinAccount | undefined {
  if (!profile?.address) return undefined;
  if (profile.account) return profile.account;
  return {
    name: profile.name ?? '',
    symbol: profile.symbol ?? '',
    type: '',
    website: '',
    description: '',
    status: STATUS.SUCCESS,
    address: profile.address as spCoinAccount['address'],
    logoURL: profile.logoURL ?? '',
    balance: 0n,
  };
}

function accountRows(rows: Array<{ role: MessageAccountEntry['role']; profile?: ReceiptProfile; detail?: string }>): MessageAccountEntry[] {
  const out: MessageAccountEntry[] = [];
  for (const row of rows) {
    const account = toMessageAccount(row.profile);
    if (account) out.push({ role: row.role, account, detail: row.detail });
  }
  return out;
}

function confirmed(title: string, hash: string, summary: Array<[string, string]>, receipt: HostTransactionResult & { ok: true }) {
  const mined = receipt.receipt;
  return [
    title,
    '',
    'Transaction Hash',
    hash,
    '',
    ...summary.map(([label, value]) => `${label}: ${value}`),
    `Block: ${mined?.blockNumber != null ? String(mined.blockNumber) : 'N/A'}`,
    `Gas Used: ${mined?.gasUsed != null ? String(mined.gasUsed) : 'N/A'}`,
    '',
    '--------------------------------',
    '',
    'Transaction Details',
    `Status: ${mined ? (mined.status === 1 ? 'Success' : 'Failed') : 'Unknown'}`,
    MESSAGE_ACCOUNTS_MARKER,
  ].join('\n');
}

export function buildSendReceipt(input: {
  result: HostTransactionResult;
  amount: string;
  tokenSymbol: string;
  tokenAddress?: string;
  from?: ReceiptProfile;
  to?: ReceiptProfile;
}): ErrorMessage {
  const accounts = accountRows([
    { role: 'ACCOUNT', profile: input.from, detail: 'Sender' },
    { role: 'ACCOUNT', profile: input.to, detail: 'Recipient' },
  ]);
  if (!input.result.ok) {
    return { errCode: 0, msg: [input.result.message, '', MESSAGE_ACCOUNTS_MARKER].join('\n'), source: 'SendTab:send', status: STATUS.MESSAGE_ERROR, accounts: accounts.slice(0, 1) };
  }
  const summary: Array<[string, string]> = input.tokenAddress ? [['Contract', input.tokenAddress], ['Method', 'transfer']] : [];
  return {
    errCode: 0,
    msg: confirmed('Send confirmed.', input.result.hash, summary, input.result),
    source: 'SendTab:send',
    status: STATUS.SUCCESS,
    accounts,
    amount: { label: `Sent ${input.tokenSymbol}`.trim(), value: input.amount.trim() },
  };
}

export function buildStakeReceipt(input: {
  result: HostTransactionResult;
  amount: string;
  stakeSymbol: string;
  contractAddress?: string;
  sponsor?: ReceiptProfile;
  recipient?: ReceiptProfile;
  agent?: ReceiptProfile;
  sponsorRatePct?: number;
  recipientRatePct?: number;
  agentRatePct?: number;
}): ErrorMessage {
  const accounts = accountRows([
    { role: 'SPONSOR', profile: input.sponsor, detail: input.sponsorRatePct != null ? `Sponsor Rate: ${input.sponsorRatePct}%` : undefined },
    { role: 'RECIPIENT', profile: input.recipient, detail: input.recipientRatePct != null ? `Recipient Rate: ${input.recipientRatePct}%` : undefined },
    { role: 'AGENT', profile: input.agent, detail: input.agentRatePct != null ? `Agent Rate: ${input.agentRatePct}%` : undefined },
  ]);
  if (!input.result.ok) {
    return { errCode: 0, msg: input.result.message, source: 'SponsorTab:stake', status: STATUS.MESSAGE_ERROR, accounts: [] };
  }
  const summary: Array<[string, string]> = [
    ...(input.contractAddress ? ([['Contract', input.contractAddress]] as Array<[string, string]>) : []),
    ['Method', input.result.methodName ?? 'addSponsorship'],
  ];
  return {
    errCode: 0,
    msg: confirmed('Stake confirmed.', input.result.hash, summary, input.result),
    source: 'SponsorTab:stake',
    status: STATUS.SUCCESS,
    accounts,
    amount: { label: input.stakeSymbol ? `Staked ${input.stakeSymbol}` : 'Staked spCoins', value: input.amount.trim() },
  };
}

export interface UnstakeReceiptLeg {
  txHash: string;
  gasUsed: bigint;
  status: 'ok' | 'failed';
  error?: string;
}

/** The Un-Stake result card, in the format the web app's SponsorStakingListPanel builds for it. */
export function buildUnstakeReceipt(input: {
  status: 'complete' | 'partial' | 'failed';
  legs: UnstakeReceiptLeg[];
  legCount: number;
  unstakedAmount: string;
  sponsor?: ReceiptProfile;
  recipient?: ReceiptProfile;
  agent?: ReceiptProfile;
  rateKey?: string;
}): ErrorMessage {
  if (input.status !== 'complete') {
    const failedLeg = input.legs.find((leg) => leg.status === 'failed');
    const okCount = input.legs.filter((leg) => leg.status === 'ok').length;
    return {
      errCode: 0,
      msg:
        input.status === 'failed'
          ? `Un-Stake failed: ${failedLeg?.error ?? 'unknown error'}`
          : `Un-Stake partially completed (${okCount} of ${input.legCount} steps) before a step failed: ${failedLeg?.error ?? 'unknown error'}`,
      source: 'SponsorStakingList:unstake',
      status: input.status === 'failed' ? STATUS.MESSAGE_ERROR : STATUS.TRACE_DEBUGGING,
    };
  }
  const totalGasUsed = input.legs.reduce((sum, leg) => sum + leg.gasUsed, 0n);
  const detailRows: Array<[string, string]> = [['Status', 'Success'], ['Legs', String(input.legCount)], ['Gas Used', String(totalGasUsed)]];
  const accounts = accountRows([
    { role: 'SPONSOR', profile: input.sponsor },
    { role: 'RECIPIENT', profile: input.recipient, detail: input.rateKey ? `Rate Key: ${input.rateKey}%` : undefined },
    { role: 'AGENT', profile: input.agent },
  ]);
  return {
    errCode: 0,
    msg: [
      'Un-Stake confirmed.',
      '',
      input.legs.length === 1 ? 'Transaction Hash' : 'Transaction Hashes',
      ...input.legs.map((leg, i) => (input.legs.length === 1 ? leg.txHash : `${i + 1}. ${leg.txHash}`)),
      '',
      '--------------------------------',
      '',
      'Transaction Details',
      ...detailRows.map(([label, value]) => `${label}: ${value}`),
      MESSAGE_ACCOUNTS_MARKER,
    ].join('\n'),
    source: 'SponsorStakingList:unstake',
    status: STATUS.SUCCESS,
    accounts,
    amount: { label: 'Unstaked spCoins', value: input.unstakedAmount },
  };
}
