// @ts-nocheck
// File: /@sponsorcoin/spcoin-access-modules/utils/utils.js
export const dumpList = (_prefix, _arr) => {
    spCoinLogger.logFunctionHeader("dumpList = async(" + _prefix + ", _arr)");
    const maxCount = _arr.length;
    //   spCoinLogger.logDetail("JS => DUMPING " + maxCount + " RECORDS");
    for (idx = 0; idx < maxCount; idx++) {
        const element = _arr[idx];
        spCoinLogger.log(_prefix + idx + ": " + element);
    }
    spCoinLogger.logExitFunction();
};
