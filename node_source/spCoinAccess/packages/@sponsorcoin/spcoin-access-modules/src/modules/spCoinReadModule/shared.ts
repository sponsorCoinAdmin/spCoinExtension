// @ts-nocheck
export const SPONSOR = 0;
export const RECIPIENT = 1;
export const AGENT = 2;
export const getRewardType = (_accountType) => {
    return getAccountTypeString(_accountType) + " REWARDS";
};
export const getAccountTypeString = (_accountType) => {
    const strAccountType = "";
    if (_accountType == SPONSOR)
        return "SPONSOR";
    else if (_accountType == RECIPIENT)
        return "RECIPIENT";
    else if (_accountType == AGENT)
        return "AGENT";
    return strAccountType;
};
export const getSourceTypeDelimiter = (_accountType) => {
    if (_accountType == SPONSOR)
        return "RECIPIENT_ACCOUNT:";
    else if (_accountType == RECIPIENT)
        return "SPONSOR_ACCOUNT:";
    else if (_accountType == AGENT)
        return "RECIPIENT_ACCOUNT:";
    return undefined;
};

