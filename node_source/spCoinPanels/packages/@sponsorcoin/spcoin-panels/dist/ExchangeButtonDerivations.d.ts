import type { ReactNode } from 'react';
import { BUTTON_TYPE, STATUS, TRADE_DIRECTION } from '@sponsorcoin/spcoin-common/context';
export interface ExchangeButtonDerivationsParams {
    buttonType: BUTTON_TYPE;
    showBusyLabel: boolean;
    sponsorMode: 'SPONSOR' | 'STAKE' | 'REVOKE';
    hasAgent: boolean;
    tradeDirection: TRADE_DIRECTION;
    sellTokenSymbol?: string;
    buyTokenSymbol?: string;
    isLoadingPrice: boolean;
    tokensRequired: boolean;
    sellTokenRequired: boolean;
    buyTokenRequired: boolean;
    amountRequired: boolean;
    insufficientSellBalance: boolean;
    errorMessage?: {
        status: STATUS;
    } | null;
    isSponsorPanel: boolean;
    isNoPool?: boolean;
}
export declare function deriveButtonType(params: {
    isLoadingPrice: boolean;
    tokensRequired: boolean;
    sellTokenRequired: boolean;
    buyTokenRequired: boolean;
    amountRequired: boolean;
    insufficientSellBalance: boolean;
    errorMessage?: {
        status: STATUS;
    } | null;
}): BUTTON_TYPE;
export declare function deriveButtonText(params: {
    buttonType: BUTTON_TYPE;
    showBusyLabel: boolean;
    sponsorMode: 'SPONSOR' | 'STAKE' | 'REVOKE';
    hasAgent: boolean;
    tradeDirection: TRADE_DIRECTION;
    sellTokenSymbol?: string;
    buyTokenSymbol?: string;
    isSponsorPanel: boolean;
}): ReactNode;
export type ActionButtonBgClass = 'bg-[#243056]' | 'bg-[#501505]' | 'bg-[#1f3e1d]' | 'bg-orange-600';
export declare function deriveBgClass(params: {
    buttonType: BUTTON_TYPE;
    showBusyLabel: boolean;
}): ActionButtonBgClass;
export declare function deriveNoPoolWarning(params: {
    isSponsorPanel: boolean;
    sponsorMode: 'SPONSOR' | 'STAKE' | 'REVOKE';
    isNoPool?: boolean;
    buttonType: BUTTON_TYPE;
}): boolean;
