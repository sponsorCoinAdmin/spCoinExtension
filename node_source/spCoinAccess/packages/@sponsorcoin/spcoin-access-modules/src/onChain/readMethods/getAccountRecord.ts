// @ts-nocheck
import { Interface } from 'ethers';
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';
import { timeOnChainCall } from '../../utils/methodTiming';

const accountRecordInterface = new Interface([
  'function getAccountRecord(address _accountKey) view returns (address accountKey, uint256 creationTime, uint256 accountBalance, uint256 stakedAccountSPCoins, uint256 accountStakingRewards, uint256 sponsorCount, uint256 recipientCount, uint256 agentCount, uint256 parentRecipientCount, uint256 lastSponsorUpdateTimeStamp, uint256 lastRecipientUpdateTimeStamp, uint256 lastAgentUpdateTimeStamp)',
]);

const ACCOUNT_RECORD_FIELDS = [
  'accountKey',
  'creationTime',
  'accountBalance',
  'stakedAccountSPCoins',
  'accountStakingRewards',
  'sponsorCount',
  'recipientCount',
  'agentCount',
  'parentRecipientCount',
  'lastSponsorUpdateTimeStamp',
  'lastRecipientUpdateTimeStamp',
  'lastAgentUpdateTimeStamp',
];

export async function callGetAccountRecord(contract, accountKey) {
  const target = String(contract?.target || (typeof contract?.getAddress === 'function' ? await contract.getAddress() : ''));
  const runner = contract?.runner;
  if (!target || !runner || typeof runner.call !== 'function') {
    throw new Error('SpCoin read method getAccountRecord is not available on access modules or contract.');
  }
  const data = accountRecordInterface.encodeFunctionData('getAccountRecord', [accountKey]);
  const raw = await timeOnChainCall('getAccountRecord', () => runner.call({ to: target, data }));
  return accountRecordInterface.decodeFunctionResult('getAccountRecord', raw);
}

export function normalizeAccountRecordResult(result, requestedAccountKey) {
  const source = result && typeof result === 'object' ? result : [];
  return Object.fromEntries(
    ACCOUNT_RECORD_FIELDS.map((field, index) => [
      field,
      source[field] ?? source[index] ?? (field === 'accountKey' ? requestedAccountKey : undefined),
    ]),
  );
}

const handler = buildHandler('getAccountRecord', async (context) => {
  const accountKey = String(context.methodArgs[0] || '');
  const method =
    getDynamicMethod(context.contract, 'getAccountRecord') ||
    getDynamicMethod(context.staking, 'getAccountRecord');
  const result = method ? await method(accountKey) : await callGetAccountRecord(context.contract, accountKey);
  return normalizeAccountRecordResult(result, accountKey);
});

export default handler;
