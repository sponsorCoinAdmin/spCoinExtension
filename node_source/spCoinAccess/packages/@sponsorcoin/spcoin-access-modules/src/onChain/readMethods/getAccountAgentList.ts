// @ts-nocheck
import { Interface } from 'ethers';
import { buildHandler } from '../../readMethodRuntime';
import { timeOnChainCall } from '../../utils/methodTiming';

const accountLinksInterface = new Interface([
  'function getAccountLinks(address _accountKey) view returns (address[] sponsorKeys, address[] recipientKeys, address[] agentKeys, address[] parentRecipientKeys)',
]);

async function callGetAccountLinks(contract, accountKey) {
  const target = String(contract?.target || (typeof contract?.getAddress === 'function' ? await contract.getAddress() : ''));
  const runner = contract?.runner;
  if (!target || !runner || typeof runner.call !== 'function') {
    throw new Error('SpCoin read method getAccountAgentList is not available on access modules or contract.');
  }
  const data = accountLinksInterface.encodeFunctionData('getAccountLinks', [accountKey]);
  const raw = await timeOnChainCall('getAccountLinks', () => runner.call({ to: target, data }));
  const decoded = accountLinksInterface.decodeFunctionResult('getAccountLinks', raw);
  return decoded;
}

const handler = buildHandler('getAgentKeys', async (context) => {
  const accountKey = String(context.methodArgs[0] || '');
  if (typeof context.contract.getAgentKeys === 'function') {
    return context.normalizeStringListResult(await context.contract.getAgentKeys(accountKey));
  }
  if (typeof context.read.getAgentKeys === 'function') {
    return context.normalizeStringListResult(await context.read.getAgentKeys(accountKey));
  }
  if (typeof context.contract.getAccountLinks === 'function') {
    const links = await context.contract.getAccountLinks(accountKey);
    return context.normalizeStringListResult(Array.isArray(links?.[2]) ? links[2] : []);
  }

  const decoded = await callGetAccountLinks(context.contract, accountKey);
  return context.normalizeStringListResult(Array.isArray(decoded?.[2]) ? decoded[2] : []);
});

export default handler;
