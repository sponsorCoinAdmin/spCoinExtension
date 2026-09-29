// @ts-nocheck
import { getMasterAccountMetaData } from "./getMasterAccountMetaData";

function toCount(value) {
    if (value == null) return null;
    const count = Number(value);
    return Number.isFinite(count) ? count : null;
}

export async function getAccountListSize(context) {
    const runtime = context;
    runtime.spCoinLogger.logFunctionHeader("getMasterAccountKeyCount = async()");
    try {
        const metaData = await getMasterAccountMetaData(runtime);
        const count = toCount(metaData?.masterAccountSize ?? metaData?.numberOfAccounts ?? metaData?.[0]);
        if (count != null) {
            runtime.spCoinLogger.logDetail("JS => Found " + count + " Account Keys");
            runtime.spCoinLogger.logExitFunction();
            return count;
        }
    } catch {
        // Older deployments can derive this from legacy count/list readers.
    }
    if (typeof runtime.spCoinContractDeployed?.getMasterAccountKeyCount === "function") {
        try {
            const count = Number(await runtime.spCoinContractDeployed.getMasterAccountKeyCount());
            runtime.spCoinLogger.logDetail("JS => Found " + count + " Account Keys");
            runtime.spCoinLogger.logExitFunction();
            return count;
        } catch {
            // Continue to newer metadata/list fallbacks when a stale ABI exposes this removed selector.
        }
    }
    if (typeof runtime.spCoinContractDeployed?.getAccountKeyCount === "function") {
        try {
            const count = Number(await runtime.spCoinContractDeployed.getAccountKeyCount());
            runtime.spCoinLogger.logDetail("JS => Found " + count + " Account Keys");
            runtime.spCoinLogger.logExitFunction();
            return count;
        } catch {
            // Continue to list fallbacks when a stale ABI exposes this removed selector.
        }
    }
    const loadAccountKeys =
        typeof runtime.getMasterAccountKeys === "function"
            ? runtime.getMasterAccountKeys.bind(runtime)
            : typeof runtime.getAccountKeys === "function"
                ? runtime.getAccountKeys.bind(runtime)
                : typeof runtime.getMasterAccountList === "function"
                    ? runtime.getMasterAccountList.bind(runtime)
                    : null;
    if (!loadAccountKeys) {
        throw new Error("getMasterAccountKeyCount requires getMasterAccountKeys() on the current read runtime.");
    }
    const maxSize = (await loadAccountKeys()).length;
    runtime.spCoinLogger.logDetail("JS => Found " + maxSize + " Account Keys");
    runtime.spCoinLogger.logExitFunction();
    return maxSize;
}

export const getAccountKeyCount = getAccountListSize;
export const getMasterAccountKeyCount = getAccountListSize;
export const getMasterAccountCount = getAccountListSize;
export const getMasterAccountListSize = getAccountListSize;

