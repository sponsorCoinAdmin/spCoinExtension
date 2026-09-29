// @ts-nocheck
import { Interface } from 'ethers';
import { buildHandler } from '../../readMethodRuntime';
import { timeOnChainCall } from '../../utils/methodTiming';
import getAccountRecord from './getAccountRecord';

const accountLinksInterface = new Interface([
  'function getAccountLinks(address _accountKey) view returns (address[] sponsorKeys, address[] recipientKeys, address[] agentKeys, address[] parentRecipientKeys)',
]);

async function callGetAccountLinks(contract, accountKey) {
  const target = String(contract?.target || (typeof contract?.getAddress === 'function' ? await contract.getAddress() : ''));
  const runner = contract?.runner;
  if (!target || !runner || typeof runner.call !== 'function') {
    throw new Error('SpCoin read method getAgentKeyCount requires getAgentKeys() or getAccountAgentList() on access modules or contract.');
  }
  const data = accountLinksInterface.encodeFunctionData('getAccountLinks', [accountKey]);
  const raw = await timeOnChainCall('getAccountLinks', () => runner.call({ to: target, data }));
  return accountLinksInterface.decodeFunctionResult('getAccountLinks', raw);
}

function toCount(value) {
  if (value == null) return null;
  const count = Number(value);
  return Number.isFinite(count) ? count : null;
}

const handler = buildHandler('getAgentKeyCount', async (context) => {
  const accountKey = String(context.methodArgs[0] || '');
  try {
    const accountRecord = await getAccountRecord.run({ ...context, methodArgs: [accountKey] });
    const count = toCount(accountRecord?.agentCount ?? accountRecord?.[7]);
    if (count != null) return count;
  } catch {
    // Older deployments can derive this from agent list/link reads.
  }
  const method =
    typeof context.read.getAgentKeys === 'function'
      ? context.read.getAgentKeys
      : typeof context.read.getAgentList === 'function'
        ? context.read.getAgentList
      : typeof context.read.getAccountAgentList === 'function'
        ? context.read.getAccountAgentList
        : null;
  if (typeof method !== 'function') {
    if (typeof context.contract.getAccountLinks === 'function') {
      const links = await context.contract.getAccountLinks(accountKey);
      const agentList = context.normalizeStringListResult(Array.isArray(links?.[2]) ? links[2] : []);
      return agentList.length;
    }
    const decoded = await callGetAccountLinks(context.contract, accountKey);
    const agentList = context.normalizeStringListResult(Array.isArray(decoded?.[2]) ? decoded[2] : []);
    return agentList.length;
  }
  const agentList = context.normalizeStringListResult(await method(accountKey));
  return agentList.length;
});

export default handler;
