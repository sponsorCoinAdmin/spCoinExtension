import React from 'react';
import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
export declare function CopyBtn({ text }: {
    text: string;
}): React.JSX.Element;
/** The rows of a token's detail table: the record's fields, addresses and urls with a copy button. */
export declare function tokenDetailRows(contract: TokenContract): ({
    label: string;
    value: string;
} | {
    label: string;
    value: React.JSX.Element;
})[];
/** Detail view for the Sponsor tab's buy token: always the active spCoin (sponsoring stakes into the currently active spCoin contract). */
export declare function TokenBuyPanel(): React.JSX.Element;
export declare function TokenSellPanel(): React.JSX.Element;
export declare function TokenBuySwapPanel(): React.JSX.Element;
export declare function TokenSellSwapPanel(): React.JSX.Element;
/** Read from tradeData.sendTokenContract, the field the web app's useSendTokenContract reads. */
export declare function TokenSendPanel(): React.JSX.Element;
