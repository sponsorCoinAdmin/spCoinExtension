// @ts-nocheck
import { normalizeRawQuantityUnits } from "../shared";
async function readMasterAccountKeys(contract) {
    const legacyMethod = contract?.getMasterAccountKeys ??
        contract?.getAccountKeys ??
        contract?.getMasterAccountList ??
        contract?.getAccountList;
    return typeof legacyMethod === "function" ? legacyMethod.call(contract) : [];
}
export const addAgentSponsorship = async (context, _sponsorSigner, _recipientKey, _recipientRateKey, _accountAgentKey, _agentRateKey, _transactionQty) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const toDebugJson = (value) => JSON.stringify(value, (_key, innerValue) => (typeof innerValue === "bigint" ? innerValue.toString() : innerValue), 2);
    const toAddressList = (value) => Array.isArray(value) ? value.map((entry) => String(entry || "").toLowerCase()) : [];
    const getErrorMessage = (error) => {
        if (error instanceof Error) {
            return error.message;
        }
        if (error && typeof error === "object" && typeof error.message === "string") {
            return error.message;
        }
        return String(error);
    };
    const isTransientFetchError = (error) => /failed to fetch/i.test(getErrorMessage(error));
    const hasTransactionHash = (error) => Boolean(error?.transactionHash ||
        error?.transaction?.hash ||
        error?.receipt?.hash ||
        error?.receipt?.transactionHash);
    const waitForVisibility = async (label, loadValue, isVisible, attempts = 40, delayMs = 500) => {
        let lastValue;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            lastValue = await loadValue();
            const visible = isVisible(lastValue);
            context.spCoinLogger.logDetail("JS => " + label + " visibility check #" + String(attempt) + " = " + toDebugJson(lastValue));
            if (visible) {
                return lastValue;
            }
            await sleep(delayMs);
        }
        throw new Error(label + " did not become visible on the RPC after the transaction receipt confirmed.");
    };
    const sendTxWithDiagnostics = async (label, send) => {
        const contractRunner = context.spCoinContractDeployed?.runner;
        const provider = contractRunner?.provider;
        try {
            if (provider && typeof provider.getBlockNumber === "function") {
                const blockNumber = await provider.getBlockNumber();
                context.spCoinLogger.logDetail("JS => " + label + " preflight blockNumber = " + String(blockNumber));
            }
            if (contractRunner && typeof contractRunner.getNonce === "function") {
                const nonce = await contractRunner.getNonce("pending");
                context.spCoinLogger.logDetail("JS => " + label + " preflight nonce = " + String(nonce));
            }
            if (provider && typeof provider.getFeeData === "function") {
                const feeData = await provider.getFeeData();
                context.spCoinLogger.logDetail("JS => " + label + " preflight feeData = " +
                    JSON.stringify({
                        gasPrice: feeData?.gasPrice?.toString?.() ?? String(feeData?.gasPrice ?? ""),
                        maxFeePerGas: feeData?.maxFeePerGas?.toString?.() ?? String(feeData?.maxFeePerGas ?? ""),
                        maxPriorityFeePerGas: feeData?.maxPriorityFeePerGas?.toString?.() ?? String(feeData?.maxPriorityFeePerGas ?? ""),
                    }));
            }
        }
        catch (preflightError) {
            const message = preflightError instanceof Error ? preflightError.message : String(preflightError);
            context.spCoinLogger.logDetail("JS => " + label + " preflight failed: " + message);
        }
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                if (attempt > 1) {
                    context.spCoinLogger.logDetail("JS => " + label + " retry send attempt #" + String(attempt));
                }
                return await send();
            }
            catch (error) {
                const detail = error && typeof error === "object"
                    ? toDebugJson({
                        message: error?.message,
                        reason: error?.reason,
                        code: error?.code,
                        action: error?.action,
                        shortMessage: error?.shortMessage,
                        data: error?.data,
                        info: error?.info,
                        error: error?.error,
                    })
                    : String(error);
                context.spCoinLogger.logDetail("JS => " + label + " send failed detail = " + detail);
                const shouldRetry = attempt < maxAttempts &&
                    isTransientFetchError(error) &&
                    !hasTransactionHash(error);
                if (!shouldRetry) {
                    throw error;
                }
                context.spCoinLogger.logDetail("JS => " + label + " transient fetch failure; waiting before retry");
                await sleep(1000 * attempt);
            }
        }
    };
    const ensureSuccessfulReceipt = (label, receipt) => {
        const status = Number(receipt?.status ?? 0);
        context.spCoinLogger.logDetail("JS => " + label + " receipt status = " + String(receipt?.status ?? ""));
        if (status !== 1) {
            throw new Error(label + " reverted on-chain with receipt status " + String(receipt?.status ?? "unknown"));
        }
    };
    const isMissingSelectorError = (error) => {
        const message = getErrorMessage(error);
        const code = String(error?.code || error?.error?.code || "");
        const data = String(error?.data || error?.error?.data || "");
        const action = String(error?.action || error?.error?.action || "");
        return (code === "CALL_EXCEPTION" ||
            data === "0x" ||
            action === "estimateGas" ||
            /execution reverted|require\(false\)/i.test(message));
    };
    const resolveContractMethod = (methodNames) => {
        for (const methodName of methodNames) {
            const candidate = context.spCoinContractDeployed?.[methodName];
            if (typeof candidate === "function") {
                return { methodName, method: candidate.bind(context.spCoinContractDeployed) };
            }
        }
        return null;
    };
    const sendWithMethodFallback = async (label, attempts) => {
        let lastError;
        for (let index = 0; index < attempts.length; index++) {
            const attempt = attempts[index];
            const resolved = resolveContractMethod(attempt.methodNames);
            if (!resolved) {
                continue;
            }
            try {
                return await sendTxWithDiagnostics(attempt.logLabel || resolved.methodName, () => resolved.method(...attempt.args));
            }
            catch (error) {
                lastError = error;
                if (!isMissingSelectorError(error) || index === attempts.length - 1) {
                    throw error;
                }
                context.spCoinLogger.logDetail("JS => " + label + " fallback after selector failure on " + resolved.methodName);
            }
        }
        if (lastError) {
            throw lastError;
        }
        throw new Error(label + " is not available on the deployed contract.");
    };
    context.spCoinLogger.logFunctionHeader("addAgentSponsorship = async(" +
        _sponsorSigner + ", " +
        _recipientKey + ", " +
        _recipientRateKey + ", " +
        _accountAgentKey + ", " +
        _agentRateKey + ", " +
        _transactionQty + ")");
    const amount = await normalizeRawQuantityUnits(context, _transactionQty);
    const sponsorKey = typeof _sponsorSigner?.getAddress === "function"
        ? await _sponsorSigner.getAddress()
        : _sponsorSigner?.address;
    const transactionTimeStamp = Math.trunc(Date.now() / 1000);
    const safeRead = async (label, loadValue, fallback) => {
        try {
            return await loadValue();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            context.spCoinLogger.logDetail("JS => " + label + " read failed: " + message);
            return fallback;
        }
    };
    const logStructureSnapshot = async (stageLabel) => {
        const snapshot = {};
        snapshot.accountList = await safeRead("addAgentSponsorship accountList", () => readMasterAccountKeys(context.spCoinContractDeployed), []);
        if (typeof context.spCoinContractDeployed.isAccountInserted === "function") {
            snapshot.sponsorInserted = await safeRead("addAgentSponsorship sponsorInserted", () => context.spCoinContractDeployed.isAccountInserted(sponsorKey), null);
            snapshot.recipientInserted = await safeRead("addAgentSponsorship recipientInserted", () => context.spCoinContractDeployed.isAccountInserted(_recipientKey), null);
            snapshot.agentInserted = await safeRead("addAgentSponsorship agentInserted", () => context.spCoinContractDeployed.isAccountInserted(_accountAgentKey), null);
        }
        if (typeof context.spCoinContractDeployed.getRecipientKeys === "function") {
            snapshot.sponsorRecipientList = await safeRead("addAgentSponsorship sponsorRecipientList", () => context.spCoinContractDeployed.getRecipientKeys(sponsorKey), []);
        }
        const getSponsorRecipientRates = typeof context.spCoinContractDeployed.getSponsorRecipientRates === "function"
            ? context.spCoinContractDeployed.getSponsorRecipientRates
            : typeof context.spCoinContractDeployed.getSponsorRecipientRateKeys === "function"
                ? context.spCoinContractDeployed.getSponsorRecipientRateKeys
                : context.spCoinContractDeployed.getRecipientRateList;
        if (typeof getSponsorRecipientRates === "function") {
            snapshot.recipientRateList = await safeRead("addAgentSponsorship recipientRateList", () => getSponsorRecipientRates(sponsorKey, _recipientKey), []);
        }
        if (typeof context.spCoinContractDeployed.getRecipientRateAgentList === "function") {
            snapshot.recipientRateAgentList = await safeRead("addAgentSponsorship recipientRateAgentList", () => context.spCoinContractDeployed.getRecipientRateAgentList(sponsorKey, _recipientKey, _recipientRateKey), []);
        }
        context.spCoinLogger.logDetail("JS => addAgentSponsorship structure " + stageLabel + " = " + toDebugJson(snapshot));
    };
    context.spCoinLogger.logDetail("JS => addAgentSponsorship sponsor/recipient/rate/agent/agentRate/amount/timestamp = " +
        String(sponsorKey || "") + "/" +
        String(_recipientKey) + "/" +
        String(_recipientRateKey) + "/" +
        String(_accountAgentKey) + "/" +
        String(_agentRateKey) + "/" +
        String(amount) + "/" +
        String(transactionTimeStamp));
    try {
        context.spCoinLogger.logDetail("JS => addAgentSponsorship stage = direct-transaction:send");
        const directTx = await sendWithMethodFallback("direct agent transaction", [
            {
                methodNames: ["sponsorAgentTransaction", "sponsorAgentTransaction"],
                args: [
                    _recipientKey,
                    _recipientRateKey,
                    _accountAgentKey,
                    _agentRateKey,
                    amount,
                ],
                logLabel: "sponsorAgentTransaction",
            },
            {
                methodNames: ["addSponsorship"],
                args: [_recipientKey, _recipientRateKey, _accountAgentKey, _agentRateKey, amount],
                logLabel: "addSponsorship",
            },
        ]);
        context.spCoinLogger.logDetail("JS => addAgentSponsorship stage = direct-transaction:complete");
        context.spCoinLogger.logExitFunction();
        return directTx;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        context.spCoinLogger.logDetail("JS => addAgentSponsorship direct transaction path failed: " + message);
        throw error;
    }
};
