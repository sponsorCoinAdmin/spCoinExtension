// @ts-nocheck
export async function getSpCoinMetaData(context) {
    context.spCoinLogger.logFunctionHeader("getSpCoinMetaData()");
    const normalizeRangeTuple = (value) => {
        if (Array.isArray(value)) {
            return [Number(value?.[0] ?? 0), Number(value?.[1] ?? 0)];
        }
        return [0, Number(value ?? 0)];
    };
    const readCreationDate = async () => {
        const creationTimeFn = context.spCoinContractDeployed?.creationTime;
        if (typeof creationTimeFn !== "function") {
            return "";
        }
        try {
            const rawCreationTime = await creationTimeFn.call(context.spCoinContractDeployed);
            const seconds = Number(rawCreationTime ?? 0);
            if (!Number.isFinite(seconds) || seconds <= 0) {
                return "";
            }
            return new Date(seconds * 1000).toISOString();
        }
        catch (_error) {
            return "";
        }
    };
    const getRateRangeTuple = async (rangeReader, lowerReader, upperReader) => {
        const rangeFn = context.spCoinContractDeployed?.[rangeReader];
        if (typeof rangeFn === "function") {
            const rangeResult = await rangeFn.call(context.spCoinContractDeployed);
            return normalizeRangeTuple(rangeResult);
        }
        const lowerFn = context.spCoinContractDeployed?.[lowerReader];
        const upperFn = context.spCoinContractDeployed?.[upperReader];
        if (typeof lowerFn === "function" && typeof upperFn === "function") {
            const [lowerRate, upperRate] = await Promise.all([
                lowerFn.call(context.spCoinContractDeployed),
                upperFn.call(context.spCoinContractDeployed),
            ]);
            return [Number(lowerRate ?? 0), Number(upperRate ?? 0)];
        }
        return [0, 0];
    };
    const readOptionalValue = async (readers, fallbackValue) => {
        for (const reader of readers) {
            const contractReader = context.spCoinContractDeployed?.[reader];
            if (typeof contractReader !== "function")
                continue;
            try {
                return await contractReader.call(context.spCoinContractDeployed);
            }
            catch (_error) {
                continue;
            }
        }
        return fallbackValue;
    };
    const [owner, version, name, symbol, decimals, totalSupply, inflationRate, recipientRateRange, agentRateRange, creationDate] = await Promise.all([
        readOptionalValue(["owner", "getRootAdmin"], ""),
        readOptionalValue(["version", "getVersion"], ""),
        readOptionalValue(["name"], ""),
        readOptionalValue(["symbol"], ""),
        readOptionalValue(["decimals"], 0),
        readOptionalValue(["totalSupply"], "0"),
        readOptionalValue(["getInflationRate"], 10),
        getRateRangeTuple("getRecipientRateRange", "getLowerRecipientRate", "getUpperRecipientRate"),
        getRateRangeTuple("getAgentRateRange", "getLowerAgentRate", "getUpperAgentRate"),
        readCreationDate(),
    ]);
    context.spCoinLogger.logExitFunction();
    return {
        agentRateRange: normalizeRangeTuple(agentRateRange),
        creationDate,
        decimals: Number(decimals ?? 0),
        inflationRate: Number(inflationRate ?? 0),
        name: String(name ?? ""),
        owner: String(owner ?? ""),
        recipientRateRange: normalizeRangeTuple(recipientRateRange),
        symbol: String(symbol ?? ""),
        totalSupply: String(totalSupply ?? "0"),
        version: String(version ?? ""),
    };
}

