// @ts-nocheck
import {
    getRelationshipReadCache,
    normalizeAccountRecordCacheKey,
} from './getAccountRecord';

function listLength(value) {
    return Array.isArray(value) ? value.length : 0;
}

function normalizeAccountKey(value) {
    return String(value ?? '').trim().toLowerCase();
}

export const NA = 0;
export const SPONSOR = 1;
export const RECIPIENT = 2;
export const AGENT = 4;

function buildRolesMask(isSponsor, isRecipient, isAgent) {
    return (
        (isSponsor ? SPONSOR : NA) |
        (isRecipient ? RECIPIENT : NA) |
        (isAgent ? AGENT : NA)
    );
}

function buildAccountRoleSummary(accountKey, accountRecord, source) {
    const normalizedAccountKey = normalizeAccountKey(accountRecord?.accountKey || accountKey);
    const sponsorCount = listLength(accountRecord?.sponsorKeys);
    const recipientCount = listLength(accountRecord?.recipientKeys);
    const agentCount = listLength(accountRecord?.agentKeys);
    const parentRecipientCount = listLength(accountRecord?.parentRecipientKeys);
    const recipientRateTransactionSetCount = listLength(accountRecord?.recipientRateTransactionSetKeys);
    const agentRateTransactionSetCount = listLength(accountRecord?.agentRateTransactionSetKeys);
    const isSponsor = recipientCount > 0;
    const isRecipient = sponsorCount > 0 || agentCount > 0 || recipientRateTransactionSetCount > 0;
    const isAgent = parentRecipientCount > 0 || agentRateTransactionSetCount > 0;
    const roles = buildRolesMask(isSponsor, isRecipient, isAgent);

    return {
        TYPE: '--ACCOUNT_ROLE_SUMMARY--',
        accountKey: normalizedAccountKey,
        roles,
        isSponsor,
        isRecipient,
        isAgent,
        source,
        counts: {
            sponsorCount,
            recipientCount,
            agentCount,
            parentRecipientCount,
            recipientRateTransactionSetCount,
            agentRateTransactionSetCount,
        },
    };
}

async function readAccountRoleRecord(runtime, accountKey) {
    const readAccountRecord = runtime?.spCoinContractDeployed?.getAccountRecord;
    if (typeof readAccountRecord !== 'function') {
        throw new Error('getAccountRoleSummary requires getAccountRecord().');
    }
    const record = await readAccountRecord(accountKey);
    return {
        accountKey: record?.accountKey ?? record?.[0] ?? accountKey,
        sponsorKeys: Array(Number(record?.sponsorCount ?? record?.[5] ?? 0)).fill(null),
        recipientKeys: Array(Number(record?.recipientCount ?? record?.[6] ?? 0)).fill(null),
        agentKeys: Array(Number(record?.agentCount ?? record?.[7] ?? 0)).fill(null),
        parentRecipientKeys: Array(Number(record?.parentRecipientCount ?? record?.[8] ?? 0)).fill(null),
        recipientRateTransactionSetKeys: [],
        agentRateTransactionSetKeys: [],
    };
}

async function getCachedAccountRoleSummary(runtime, accountKey) {
    const cache = getRelationshipReadCache(runtime);
    const key = normalizeAccountRecordCacheKey(accountKey);
    if (!cache.accountRoleSummary.has(key)) {
        cache.accountRoleSummary.set(
            key,
            (async () => {
                const accountRecord = await readAccountRoleRecord(runtime, accountKey);
                return buildAccountRoleSummary(
                    accountKey,
                    accountRecord,
                    'getAccountRecord',
                );
            })(),
        );
    }
    return await cache.accountRoleSummary.get(key);
}

export async function getAccountRoleSummary(context, _accountKey) {
    return getCachedAccountRoleSummary(context, _accountKey);
}

export async function getAccountRoles(context, _accountKey) {
    const summary = await getCachedAccountRoleSummary(context, _accountKey);
    return summary.roles;
}

export async function getRoles(context, _accountKey) {
    const isSponsorRole = await isSponsor(context, _accountKey);
    const isRecipientRole = await isRecipient(context, _accountKey);
    const isAgentRole = await isAgent(context, _accountKey);
    return buildRolesMask(isSponsorRole, isRecipientRole, isAgentRole);
}

export async function isSponsor(context, _accountKey) {
    const summary = await getCachedAccountRoleSummary(context, _accountKey);
    return summary.isSponsor;
}

export async function isRecipient(context, _accountKey) {
    const summary = await getCachedAccountRoleSummary(context, _accountKey);
    return summary.isRecipient;
}

export async function isAgent(context, _accountKey) {
    const summary = await getCachedAccountRoleSummary(context, _accountKey);
    return summary.isAgent;
}
