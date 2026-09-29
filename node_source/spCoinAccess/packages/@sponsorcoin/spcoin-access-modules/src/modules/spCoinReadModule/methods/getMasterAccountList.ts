// @ts-nocheck
import { Interface } from "ethers";
import { timeOnChainCall } from "../../../utils/methodTiming";

const legacyAccountListInterface = new Interface([
    "function getAccountList() view returns (address[])",
]);

function normalizeAccountKeysResult(result) {
    if (result?.accountKeys) return result.accountKeys;
    if (Array.isArray(result) && result.length === 2 && Array.isArray(result[1])) return result[1];
    return result;
}

async function callLegacyGetAccountList(contract) {
    const target = String(contract?.target || (typeof contract?.getAddress === "function" ? await contract.getAddress() : ""));
    const runner = contract?.runner;
    if (!target || !runner || typeof runner.call !== "function") {
        throw new Error("SpCoin contract does not expose getMasterAccountKeys().");
    }
    const data = legacyAccountListInterface.encodeFunctionData("getAccountList", []);
    const raw = await timeOnChainCall("getAccountList", () => runner.call({ to: target, data }));
    const decoded = legacyAccountListInterface.decodeFunctionResult("getAccountList", raw);
    return decoded[0];
}

export async function getAccountKeys(context) {
    context.spCoinLogger.logFunctionHeader("getAccountKeys = async()");
    if (typeof context.spCoinContractDeployed.getMasterAccountKeys === "function") {
        try {
            const insertedAccountList = await context.spCoinContractDeployed.getMasterAccountKeys();
            const accountKeys = normalizeAccountKeysResult(insertedAccountList);
            context.spCoinLogger.logExitFunction();
            return accountKeys;
        } catch (error) {
            const code = String(error?.code || "");
            const data = String(error?.data || "");
            const message = String(error?.message || "");
            if (code !== "CALL_EXCEPTION" && data !== "0x" && !/execution reverted|require\(false\)/i.test(message)) {
                throw error;
            }
        }
    }
    if (typeof context.spCoinContractDeployed.getAccountList === "function") {
        const insertedAccountList = await context.spCoinContractDeployed.getAccountList();
        context.spCoinLogger.logExitFunction();
        return insertedAccountList;
    }
    const insertedAccountList = await callLegacyGetAccountList(context.spCoinContractDeployed);
    context.spCoinLogger.logExitFunction();
    return insertedAccountList;
}

export const getMasterAccountKeys = getAccountKeys;
export const getMasterAccountList = getAccountKeys;
