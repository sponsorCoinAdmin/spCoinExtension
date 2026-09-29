// @ts-nocheck
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';

const handler = buildHandler('getParentRecipientKeys', async (context) => {
  const accountKey = String(context.methodArgs?.[0] ?? '').trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(accountKey)) {
    throw new Error('SpCoin read method getParentRecipientKeys requires an account key.');
  }

  const method =
    getDynamicMethod(context.contract, 'getParentRecipientKeys') ||
    getDynamicMethod(context.staking, 'getParentRecipientKeys');
  if (method) {
    return context.normalizeStringListResult(await method(accountKey));
  }

  const accountLinksMethod =
    getDynamicMethod(context.contract, 'getAccountLinks') ||
    getDynamicMethod(context.staking, 'getAccountLinks') ||
    getDynamicMethod(context.read, 'getAccountLinks');
  if (accountLinksMethod) {
    const links = await accountLinksMethod(accountKey);
    return context.normalizeStringListResult(links?.parentRecipientKeys ?? links?.[3] ?? []);
  }

  throw new Error('SpCoin read method getParentRecipientKeys requires getParentRecipientKeys(address) or getAccountLinks(address).');
});

export default handler;
