// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/receipt/transactionReceipts.ts
//
// 2026-10-09 -- the result card (MESSAGE_PANEL content) of a confirmed or failed Send / Sponsor (stake) transaction, in the same format the web app's
// SendComponent and doStake build inline and the shared swap flow builds for Uniswap: "<what> confirmed.", the transaction hash, a flat summary
// (Contract, Method, Block, Gas Used), a dashed separator, the details (Status), the account rows, and the amount line. Pure functions; the wallet
// component shows the result through useTransactionReceipt (below the panel tree), so a host only has to report what happened.
import { MESSAGE_ACCOUNTS_MARKER, STATUS } from '@sponsorcoin/spcoin-common/context';
/** The account record the message panel's row reads, from whatever profile the wallet has. */
export function toMessageAccount(profile) {
    if (!profile?.address)
        return undefined;
    if (profile.account)
        return profile.account;
    return {
        name: profile.name ?? '',
        symbol: profile.symbol ?? '',
        type: '',
        website: '',
        description: '',
        status: STATUS.SUCCESS,
        address: profile.address,
        logoURL: profile.logoURL ?? '',
        balance: 0n,
    };
}
function accountRows(rows) {
    const out = [];
    for (const row of rows) {
        const account = toMessageAccount(row.profile);
        if (account)
            out.push({ role: row.role, account, detail: row.detail });
    }
    return out;
}
function confirmed(title, hash, summary, receipt) {
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
export function buildSendReceipt(input) {
    const accounts = accountRows([
        { role: 'ACCOUNT', profile: input.from, detail: 'Sender' },
        { role: 'ACCOUNT', profile: input.to, detail: 'Recipient' },
    ]);
    if (!input.result.ok) {
        return { errCode: 0, msg: [input.result.message, '', MESSAGE_ACCOUNTS_MARKER].join('\n'), source: 'SendTab:send', status: STATUS.MESSAGE_ERROR, accounts: accounts.slice(0, 1) };
    }
    const summary = input.tokenAddress ? [['Contract', input.tokenAddress], ['Method', 'transfer']] : [];
    return {
        errCode: 0,
        msg: confirmed('Send confirmed.', input.result.hash, summary, input.result),
        source: 'SendTab:send',
        status: STATUS.SUCCESS,
        accounts,
        amount: { label: `Sent ${input.tokenSymbol}`.trim(), value: input.amount.trim() },
    };
}
export function buildStakeReceipt(input) {
    const accounts = accountRows([
        { role: 'SPONSOR', profile: input.sponsor, detail: input.sponsorRatePct != null ? `Sponsor Rate: ${input.sponsorRatePct}%` : undefined },
        { role: 'RECIPIENT', profile: input.recipient, detail: input.recipientRatePct != null ? `Recipient Rate: ${input.recipientRatePct}%` : undefined },
        { role: 'AGENT', profile: input.agent, detail: input.agentRatePct != null ? `Agent Rate: ${input.agentRatePct}%` : undefined },
    ]);
    if (!input.result.ok) {
        return { errCode: 0, msg: input.result.message, source: 'SponsorTab:stake', status: STATUS.MESSAGE_ERROR, accounts: [] };
    }
    const summary = [
        ...(input.contractAddress ? [['Contract', input.contractAddress]] : []),
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
/** The Un-Stake result card, in the format the web app's SponsorStakingListPanel builds for it. */
export function buildUnstakeReceipt(input) {
    if (input.status !== 'complete') {
        const failedLeg = input.legs.find((leg) => leg.status === 'failed');
        const okCount = input.legs.filter((leg) => leg.status === 'ok').length;
        return {
            errCode: 0,
            msg: input.status === 'failed'
                ? `Un-Stake failed: ${failedLeg?.error ?? 'unknown error'}`
                : `Un-Stake partially completed (${okCount} of ${input.legCount} steps) before a step failed: ${failedLeg?.error ?? 'unknown error'}`,
            source: 'SponsorStakingList:unstake',
            status: input.status === 'failed' ? STATUS.MESSAGE_ERROR : STATUS.TRACE_DEBUGGING,
        };
    }
    const totalGasUsed = input.legs.reduce((sum, leg) => sum + leg.gasUsed, 0n);
    const detailRows = [['Status', 'Success'], ['Legs', String(input.legCount)], ['Gas Used', String(totalGasUsed)]];
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
