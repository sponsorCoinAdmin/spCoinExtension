import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BUTTON_TYPE, STATUS, TRADE_DIRECTION } from '@sponsorcoin/spcoin-common/context';
export function deriveButtonType(params) {
    const { isLoadingPrice, tokensRequired, sellTokenRequired, buyTokenRequired, amountRequired, insufficientSellBalance, errorMessage } = params;
    if (errorMessage?.status === STATUS.WARNING_HARDHAT)
        return BUTTON_TYPE.NO_HARDHAT_API;
    if (errorMessage?.status === STATUS.ERROR_API_PRICE)
        return BUTTON_TYPE.API_TRANSACTION_ERROR;
    if (isLoadingPrice)
        return BUTTON_TYPE.IS_LOADING_PRICE;
    if (tokensRequired)
        return BUTTON_TYPE.TOKENS_REQUIRED;
    if (sellTokenRequired)
        return BUTTON_TYPE.SELL_TOKEN_REQUIRED;
    if (buyTokenRequired)
        return BUTTON_TYPE.BUY_TOKEN_REQUIRED;
    if (amountRequired)
        return BUTTON_TYPE.ZERO_AMOUNT;
    if (insufficientSellBalance)
        return BUTTON_TYPE.INSUFFICIENT_BALANCE;
    return BUTTON_TYPE.SWAP;
}
export function deriveButtonText(params) {
    const { buttonType, showBusyLabel, sponsorMode, hasAgent, tradeDirection, sellTokenSymbol, isSponsorPanel } = params;
    if (showBusyLabel) {
        if (isSponsorPanel && sponsorMode === 'STAKE')
            return 'Staking new Sponsorship';
        if (isSponsorPanel && sponsorMode === 'SPONSOR')
            return 'Adding new Sponsorship';
        if (isSponsorPanel && sponsorMode === 'REVOKE')
            return 'Revoking Sponsorship';
        return 'Processing...';
    }
    const tradeDirectionText = tradeDirection === TRADE_DIRECTION.SELL_EXACT_OUT ? 'EXACT OUT ' : 'EXACT IN ';
    switch (buttonType) {
        case BUTTON_TYPE.TOKENS_REQUIRED:
            return 'Select Trading Pair';
        case BUTTON_TYPE.API_TRANSACTION_ERROR:
            return 'API Transaction Error';
        case BUTTON_TYPE.IS_LOADING_PRICE:
            return 'Fetching Best Price...';
        case BUTTON_TYPE.NO_HARDHAT_API:
            return 'No Hardhat API Provisioning..';
        case BUTTON_TYPE.ZERO_AMOUNT:
            return 'Enter an Amount';
        case BUTTON_TYPE.INSUFFICIENT_BALANCE:
            return `Insufficient ${sellTokenSymbol ?? 'Token'} Balance`;
        case BUTTON_TYPE.SWAP:
            if (isSponsorPanel && sponsorMode === 'STAKE') {
                return hasAgent ? 'Stake your SpCoins' : (_jsxs(_Fragment, { children: ["Stake your SpCoins ", _jsx("span", { className: "ml-2 text-orange-400", children: " ( No Agent )" })] }));
            }
            if (isSponsorPanel && sponsorMode === 'SPONSOR')
                return 'Add New Sponsorship';
            if (isSponsorPanel && sponsorMode === 'REVOKE')
                return 'Unstake your SpCoins';
            return `${tradeDirectionText} SWAP`;
        case BUTTON_TYPE.SELL_TOKEN_REQUIRED:
        case BUTTON_TYPE.SELL_ERROR_REQUIRED:
            return 'Sell Token Required';
        case BUTTON_TYPE.BUY_TOKEN_REQUIRED:
        case BUTTON_TYPE.BUY_ERROR_REQUIRED:
            return 'Buy Token(s) Required';
        default:
            return 'Button Type Undefined';
    }
}
export function deriveBgClass(params) {
    const { buttonType, showBusyLabel } = params;
    if (showBusyLabel)
        return 'bg-orange-600';
    switch (buttonType) {
        case BUTTON_TYPE.SWAP:
            return 'bg-[#1f3e1d]';
        case BUTTON_TYPE.API_TRANSACTION_ERROR:
        case BUTTON_TYPE.BUY_ERROR_REQUIRED:
        case BUTTON_TYPE.INSUFFICIENT_BALANCE:
        case BUTTON_TYPE.NO_HARDHAT_API:
        case BUTTON_TYPE.SELL_ERROR_REQUIRED:
            return 'bg-[#501505]';
        default:
            return 'bg-[#243056]';
    }
}
export function deriveNoPoolWarning(params) {
    const { isSponsorPanel, sponsorMode, isNoPool, buttonType } = params;
    return Boolean(isSponsorPanel && sponsorMode === 'SPONSOR' && isNoPool && buttonType === BUTTON_TYPE.SWAP);
}
