// @ts-nocheck
// File: /@sponsorcoin/spcoin-access-modules/utils/printTreeStructures.js
export const printTestHHAccounts = () => {
    return JSON.stringify(TEST_HH_ACCOUNT_LIST, null, 2);
};
///////////////////////////////// Structure Data //////////////////////////////
export const printStructureTree = (_structure) => {
    spCoinLogger.logFunctionHeader("printStructureTree (" + _structure + ")");
    const structure = getJSONStructureTree(_structure);
    console.log(structure);
    spCoinLogger.logExitFunction();
};
export const printStructureRecipients = async (_accountStruct) => {
    spCoinLogger.logFunctionHeader("printStructureRecipients (" + _accountStruct + ")");
    const accountRecipients = getJSONStructureRecipients(_accountKey);
    console.log(accountRecipients);
    spCoinLogger.logExitFunction();
};
export const printStructureAccountKYC = async (_accountStruct) => {
    spCoinLogger.logFunctionHeader("printStructureAccountKYC (" + _accountStruct + ")");
    const accountKYC = getJSONStructureAccountKYC(_accountKey);
    console.log(accountKYC);
    spCoinLogger.logExitFunction();
};
export const printStructureRecipientAgents = async (_recipientStruct) => {
    spCoinLogger.logFunctionHeader("printStructureRecipientAgents (" + _recipientStruct + ")");
    const recipientAgents = getJSONStructureRecipientAgents(_accountKey, _recipientKey);
    console.log(recipientAgents);
    spCoinLogger.logExitFunction();
};
///////////////////////////////// Structure Data //////////////////////////////
export const getJSONStructureTree = (_structure) => {
    spCoinLogger.logFunctionHeader("getJSONStructureTree (" + _structure + ")");
    spCoinLogger.logExitFunction();
    return JSON.stringify(_structure, null, 2);
};
export const getJSONStructureRecipients = async (_accountStruct) => {
    spCoinLogger.logFunctionHeader("getJSONStructureRecipients (" + _accountStruct + ")");
    spCoinLogger.logExitFunction();
    return JSON.stringify(_accountRecipients, null, 2);
};
export const getJSONStructureAccountKYC = async (_accountStruct) => {
    spCoinLogger.logFunctionHeader("getJSONStructureAccountKYC (" + _accountStruct + ")");
    spCoinLogger.logExitFunction();
    return JSON.stringify(_accountStruct.KYC, null, 2);
};
export const getJSONStructureRecipientAgents = async (_recipientStruct) => {
    spCoinLogger.logFunctionHeader("getJSONStructureRecipientAgents (" + _recipientStruct + ")");
    spCoinLogger.logExitFunction();
    return JSON.stringify(_recipientStruct, null, 2);
};
///////////////////////////////// NetWork Stuff //////////////////////////////
export const printNetworkRecipients = async (_accountKey) => {
    spCoinLogger.logFunctionHeader("printNetworkRecipients (" + _accountKey + ")");
    const accountRecipients = getJSONNetworkRecipients(_accountKey);
    console.log(accountRecipients);
    spCoinLogger.logExitFunction();
};
export const printNetworkAccountKYC = async (_accountKey) => {
    spCoinLogger.logFunctionHeader("printNetworkAccountKYC (" + _accountKey + ")");
    const accountKYC = getJSONNetworkAccountKYC(_accountKey);
    console.log(accountKYC);
    spCoinLogger.logExitFunction();
};
export const printNetworkRecipientAgents = async (_accountKey, _recipientKey) => {
    spCoinLogger.logFunctionHeader("printNetworkRecipientAgents (" + _accountKey + ", " + _recipientKey + ")");
    const recipientAgents = getJSONNetworkRecipientAgents(_accountKey, _recipientKey);
    console.log(recipientAgents);
    spCoinLogger.logExitFunction();
};
///////////////////////////////// NetWork Stuff //////////////////////////////
export const getJSONNetworkRecipients = async (_accountKey) => {
    spCoinLogger.logFunctionHeader("getJSONNetworkRecipients (" + _accountKey + ")");
    const accountRecipients = getNetworkRecipients(_accountKey);
    spCoinLogger.logExitFunction();
    return JSON.stringify(accountRecipients, null, 2);
};
export const getJSONNetworkAccountKYC = async (_accountKey) => {
    spCoinLogger.logFunctionHeader("getJSONNetworkAccountKYC (" + _accountKey + ")");
    const accountKYC = getNetworkAccountKYC(_accountKey);
    spCoinLogger.logExitFunction();
    return JSON.stringify(accountKYC, null, 2);
};
export const getJSONNetworkRecipientAgents = async (_accountKey, _recipientKey) => {
    spCoinLogger.logFunctionHeader("getJSONNetworkRecipientAgents (" + _accountKey + ", " + _recipientKey + ")");
    const recipientAgents = getNetworkRecipientAgents(_accountKey, _recipientKey);
    spCoinLogger.logExitFunction();
    return JSON.stringify(recipientAgents, null, 2);
};
////////////////////////// To Do Get From Network ////////////////////////////
export const getNetworkRecipients = async (_accountKey) => {
    spCoinLogger.logFunctionHeader("getNetworkRecipients (" + _accountKey + ")");
    const accountRecipients = await getNetworkRecipients(_accountKey);
    spCoinLogger.logExitFunction();
    return JSON.stringify(accountRecipients, null, 2);
};
export const getNetworkAccountKYC = async (_accountKey) => {
    spCoinLogger.logFunctionHeader("getNetworkAccountKYC (" + _accountKey + ")");
    const accountKYC = await getNetworkAccountKYC(_accountKey);
    spCoinLogger.logExitFunction();
    return JSON.stringify(accountKYC, null, 2);
};
export const getNetworkRecipientAgents = async (_accountKey, _recipientKey) => {
    spCoinLogger.logFunctionHeader("getNetworkRecipientAgents (" + _accountKey + ", " + _recipientKey + ")");
    const recipientAgents = await getNetworkRecipientAgents(_accountKey, _recipientKey);
    spCoinLogger.logExitFunction();
    return JSON.stringify(recipientAgents, null, 2);
};
