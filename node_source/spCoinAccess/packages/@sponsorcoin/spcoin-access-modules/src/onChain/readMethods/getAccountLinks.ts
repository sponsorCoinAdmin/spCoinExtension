// @ts-nocheck
import { Interface } from 'ethers';
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';
import { timeOnChainCall } from '../../utils/methodTiming';

const accountLinksInterface = new Interface([
  'function getAccountLinks(address _accountKey) view returns (address[] sponsorKeys, address[] recipientKeys, address[] agentKeys, address[] parentRecipientKeys)',
]);

async function callGetAccountLinks(contract, accountKey) {
  const target = String(contract?.target || (typeof contract?.getAddress === 'function' ? await contract.getAddress() : ''));
  const runner = contract?.runner;
  if (!target || !runner || typeof runner.call !== 'function') {
    throw new Error('SpCoin read method getAccountLinks is not available on access modules or contract.');
  }
  const data = accountLinksInterface.encodeFunctionData('getAccountLinks', [accountKey]);
  const raw = await timeOnChainCall('getAccountLinks', () => runner.call({ to: target, data }));
  return accountLinksInterface.decodeFunctionResult('getAccountLinks', raw);
}

const handler = buildHandler('getAccountLinks', async (context) => {
  const accountKey = String(context.methodArgs[0] || '');
  const method =
    getDynamicMethod(context.contract, 'getAccountLinks') ||
    getDynamicMethod(context.staking, 'getAccountLinks');
  const result = method ? await method(accountKey) : await callGetAccountLinks(context.contract, accountKey);
  const source = result && typeof result === 'object' ? result : [];
  return {
    sponsorKeys: context.normalizeStringListResult(source.sponsorKeys ?? source[0] ?? []),
    recipientKeys: context.normalizeStringListResult(source.recipientKeys ?? source[1] ?? []),
    agentKeys: context.normalizeStringListResult(source.agentKeys ?? source[2] ?? []),
    parentRecipientKeys: context.normalizeStringListResult(source.parentRecipientKeys ?? source[3] ?? []),
  };
});

export default handler;
