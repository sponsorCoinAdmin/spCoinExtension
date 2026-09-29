// @ts-nocheck
export const deleteAgentRecord = async (context, _accountKey, _recipientKey, _accountAgentKey) => {
    context.spCoinLogger.logFunctionHeader("deleteAgentRecord = async(" + _accountKey + ", " + _recipientKey + ", " + _accountAgentKey + ")");
    context.spCoinLogger.logDetail("JS => For Account[" + _accountKey + "]: " + _accountKey + ")");
    context.spCoinLogger.logDetail("JS => Deleting Agent " + _accountAgentKey + " From Blockchain Network");
    context.spCoinLogger.logDetail("JS =>  " + _accountKey + ". " + "Inserting Agent[" + _accountKey + "]: " + _accountAgentKey);
    context.spCoinLogger.logDetail("JS => " + "Deleted = " + _accountAgentKey + " Agent Record from RecipientKey " + _recipientKey);
    context.spCoinLogger.logExitFunction();
};

