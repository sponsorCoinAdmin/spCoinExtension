// @ts-nocheck
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';

const SPONSOR = 1;

async function getMasterAccountKeys(context) {
  const method =
    getDynamicMethod(context.read, 'getMasterAccountKeys')
    || getDynamicMethod(context.staking, 'getMasterAccountKeys')
    || getDynamicMethod(context.contract, 'getMasterAccountKeys')
    || getDynamicMethod(context.read, 'getAccountKeys')
    || getDynamicMethod(context.staking, 'getAccountKeys')
    || getDynamicMethod(context.contract, 'getAccountKeys')
    || getDynamicMethod(context.read, 'getMasterAccountList')
    || getDynamicMethod(context.staking, 'getMasterAccountList')
    || getDynamicMethod(context.contract, 'getMasterAccountList')
    || getDynamicMethod(context.read, 'getAccountList')
    || getDynamicMethod(context.staking, 'getAccountList')
    || getDynamicMethod(context.contract, 'getAccountList');
  if (!method) {
    throw new Error('SpCoin read method getSponsorKeys requires a master account key list source.');
  }

  const result = await method();
  if (result?.accountKeys) return result.accountKeys;
  if (Array.isArray(result) && result.length === 2 && Array.isArray(result[1])) return result[1];
  return result;
}

async function isSponsorKey(context, accountKey) {
  const method =
    getDynamicMethod(context.read, 'isSponsor')
    || getDynamicMethod(context.contract, 'isSponsor');
  if (method) return Boolean(await method(accountKey));

  const rolesMethod =
    getDynamicMethod(context.read, 'getRoles') ||
    getDynamicMethod(context.read, 'getAccountRoles');
  if (rolesMethod) {
    const roles = await rolesMethod(accountKey);
    if (typeof roles === 'number') return (roles & SPONSOR) === SPONSOR;
    if (/^[0-7]$/.test(String(roles ?? '').trim())) return (Number(roles) & SPONSOR) === SPONSOR;
    return Array.isArray(roles) && roles.map((role) => String(role).toLowerCase()).includes('sponsor');
  }

  const recordMethod = getDynamicMethod(context.read, 'getAccountRecord');
  if (recordMethod) {
    const record = await recordMethod(accountKey);
    const recipientKeys = record?.recipientKeys ?? record?.recipientList ?? [];
    const agentKeys = record?.agentKeys ?? record?.agentList ?? [];
    return (Array.isArray(recipientKeys) && recipientKeys.length > 0)
      || (Array.isArray(agentKeys) && agentKeys.length > 0);
  }

  throw new Error('SpCoin read method getSponsorKeys requires isSponsor(), getRoles(), getAccountRoles(), or getAccountRecord().');
}

const handler = buildHandler('getSponsorKeys', async (context) => {
  const accountKey = String(context.methodArgs?.[0] ?? '').trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(accountKey)) {
    const accountSponsorMethod =
      getDynamicMethod(context.contract, 'getSponsorKeys') ||
      getDynamicMethod(context.staking, 'getSponsorKeys');
    if (accountSponsorMethod) {
      return context.normalizeStringListResult(await accountSponsorMethod(accountKey));
    }

    const accountLinksMethod =
      getDynamicMethod(context.contract, 'getAccountLinks') ||
      getDynamicMethod(context.staking, 'getAccountLinks') ||
      getDynamicMethod(context.read, 'getAccountLinks');
    if (accountLinksMethod) {
      const links = await accountLinksMethod(accountKey);
      return context.normalizeStringListResult(links?.sponsorKeys ?? links?.[0] ?? []);
    }

    throw new Error('SpCoin read method getSponsorKeys(address) requires getSponsorKeys(address) or getAccountLinks(address).');
  }

  const readMethod = getDynamicMethod(context.read, 'getSponsorKeys');
  if (readMethod) {
    return context.normalizeStringListResult(await readMethod());
  }

  const accountKeys = context.normalizeStringListResult(await getMasterAccountKeys(context));
  const checks = await Promise.all(
    accountKeys.map(async (accountKey) => ({
      accountKey,
      isSponsor: await isSponsorKey(context, accountKey),
    })),
  );
  return checks.filter((entry) => entry.isSponsor).map((entry) => entry.accountKey);
});

export default handler;
