import React from 'react';
import type { NetworkElement, TokenContract } from '@sponsorcoin/spcoin-common/context';
export interface WalletDataSource {
    /** Load the full record for a token (name, symbol, logo, ...). Used by the token detail panels to fill in a token that arrived with only an address. */
    loadTokenRecord?: (chainId: number, address: string) => Promise<TokenContract | undefined>;
    /** How the host resolves a chain id to a full network element (used to preview a chain other than the live one). Default: the spcoin-feeds network registry. */
    resolveNetwork?: (chainId: number) => NetworkElement;
    /** How the host loads a network's extra fields (website, description). Default: a relative fetch of /assets/blockchains/<chainId>/info.json. */
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
