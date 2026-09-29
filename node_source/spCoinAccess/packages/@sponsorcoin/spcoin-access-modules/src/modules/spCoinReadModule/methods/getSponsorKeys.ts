// @ts-nocheck
import { getAccountKeys } from './getMasterAccountList';
import { isSponsor } from './getAccountRoleSummary';

export async function getSponsorKeys(context) {
    context.spCoinLogger.logFunctionHeader('getSponsorKeys = async()');
    const accountKeys = await getAccountKeys(context);
    const checks = await Promise.all(
        accountKeys.map(async (accountKey) => ({
            accountKey,
            isSponsor: await isSponsor(context, accountKey),
        })),
    );
    context.spCoinLogger.logExitFunction();
    return checks.filter((entry) => entry.isSponsor).map((entry) => entry.accountKey);
}

