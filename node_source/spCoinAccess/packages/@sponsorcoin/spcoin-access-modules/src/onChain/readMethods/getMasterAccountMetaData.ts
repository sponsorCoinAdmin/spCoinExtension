// @ts-nocheck
import { Interface } from 'ethers';
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';
import { timeOnChainCall } from '../../utils/methodTiming';

const masterAccountMetaDataInterface = new Interface([
  'function getMasterAccountMetaData() view returns (uint256 masterAccountSize, uint256 activeAccountCount, uint256 inactiveAccountCount, uint256 totalSponsorLinks, uint256 totalRecipientLinks, uint256 totalAgentLinks, uint256 totalParentRecipientLinks)',
]);

const MASTER_ACCOUNT_META_DATA_ABI_FIELDS = [
  'masterAccountSize',
  'activeAccountCount',
  'inactiveAccountCount',
  'totalSponsorLinks',
  'totalRecipientLinks',
  'totalAgentLinks',
  'totalParentRecipientLinks',
];
const MASTER_ACCOUNT_META_DATA_FIELDS = [...MASTER_ACCOUNT_META_DATA_ABI_FIELDS].sort((a, b) => a.localeCompare(b));

async function callGetMasterAccountMetaData(contract) {
  const target = String(contract?.target || (typeof contract?.getAddress === 'function' ? await contract.getAddress() : ''));
  const runner = contract?.runner;
  if (!target || !runner || typeof runner.call !== 'function') {
    throw new Error('SpCoin read method getMasterAccountMetaData is not available on access modules or contract.');
  }
  const data = masterAccountMetaDataInterface.encodeFunctionData('getMasterAccountMetaData', []);
  const raw = await timeOnChainCall('getMasterAccountMetaData', () => runner.call({ to: target, data }));
  return masterAccountMetaDataInterface.decodeFunctionResult('getMasterAccountMetaData', raw);
}

export function normalizeMasterAccountMetaData(result) {
  const source = result && typeof result === 'object' ? result : [];
  const values = Object.fromEntries(
    MASTER_ACCOUNT_META_DATA_ABI_FIELDS.map((field, index) => [field, source[field] ?? source[index]]),
  );
  return Object.fromEntries(MASTER_ACCOUNT_META_DATA_FIELDS.map((field) => [field, values[field]]));
}

const handler = buildHandler('getMasterAccountMetaData', async (context) => {
  const method =
    getDynamicMethod(context.read, 'getMasterAccountMetaData') ||
    getDynamicMethod(context.staking, 'getMasterAccountMetaData') ||
    getDynamicMethod(context.contract, 'getMasterAccountMetaData');
  const result = method ? await method() : await callGetMasterAccountMetaData(context.contract);
  return normalizeMasterAccountMetaData(result);
});

export default handler;
