// @ts-nocheck
import { Interface } from "ethers";
import { timeOnChainCall } from "../../../utils/methodTiming";

const masterAccountMetaDataInterface = new Interface([
  "function getMasterAccountMetaData() view returns (uint256 masterAccountSize, uint256 activeAccountCount, uint256 inactiveAccountCount, uint256 totalSponsorLinks, uint256 totalRecipientLinks, uint256 totalAgentLinks, uint256 totalParentRecipientLinks)",
]);

const MASTER_ACCOUNT_META_DATA_ABI_FIELDS = [
  "masterAccountSize",
  "activeAccountCount",
  "inactiveAccountCount",
  "totalSponsorLinks",
  "totalRecipientLinks",
  "totalAgentLinks",
  "totalParentRecipientLinks",
];
const MASTER_ACCOUNT_META_DATA_FIELDS = [...MASTER_ACCOUNT_META_DATA_ABI_FIELDS].sort((a, b) => a.localeCompare(b));

function normalizeMasterAccountMetaData(result) {
  const source = result && typeof result === "object" ? result : [];
  const values = Object.fromEntries(
    MASTER_ACCOUNT_META_DATA_ABI_FIELDS.map((field, index) => [field, source[field] ?? source[index]]),
  );
  return Object.fromEntries(MASTER_ACCOUNT_META_DATA_FIELDS.map((field) => [field, values[field]]));
}

async function callGetMasterAccountMetaData(contract) {
  const target = String(contract?.target || (typeof contract?.getAddress === "function" ? await contract.getAddress() : ""));
  const runner = contract?.runner;
  if (!target || !runner || typeof runner.call !== "function") {
    throw new Error("SpCoin contract does not expose getMasterAccountMetaData().");
  }
  const data = masterAccountMetaDataInterface.encodeFunctionData("getMasterAccountMetaData", []);
  const raw = await timeOnChainCall("getMasterAccountMetaData", () => runner.call({ to: target, data }));
  return masterAccountMetaDataInterface.decodeFunctionResult("getMasterAccountMetaData", raw);
}

export async function getMasterAccountMetaData(context) {
  context.spCoinLogger.logFunctionHeader("getMasterAccountMetaData = async()");
  const result =
    typeof context.spCoinContractDeployed.getMasterAccountMetaData === "function"
      ? await context.spCoinContractDeployed.getMasterAccountMetaData()
      : await callGetMasterAccountMetaData(context.spCoinContractDeployed);
  context.spCoinLogger.logExitFunction();
  return normalizeMasterAccountMetaData(result);
}
