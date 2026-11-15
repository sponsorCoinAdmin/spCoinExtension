import React from 'react';
import type { NetworkElement, TokenContract } from '@sponsorcoin/spcoin-common/context';
export interface WalletDataSource {
    /** Load the full record for a token (name, symbol, logo, ...). Used by the token detail panels to fill in a token that arrived with only an address. */
    loadTokenRecord?: (chainId: number, address: string) => Promise<TokenContract | undefined>;
    /** Optional host resolver for a chain id to a full network element (used to preview a chain other than the live one). Omitted when the panel can use its shared network registry. */
    resolveNetwork?: (chainId: number) => NetworkElement;
    /** Optional host loader for a network's extra fields (website, description). The connected panel otherwise fetches /assets/blockchains/<chainId>/info.json relative to its asset base. */
    loadNetworkInfo?: (chainId: number) => Promise<{
        website?: string;
        description?: string;
    } | undefined>;
}
export declare function WalletDataProvider({ value, children }: {
    value: WalletDataSource;
    children?: React.ReactNode;
}): React.JSX.Element;
export declare function useWalletData(): WalletDataSource;
