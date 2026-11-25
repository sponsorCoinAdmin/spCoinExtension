import React from 'react';
export interface BrowserProvidersProps {
    /** The chain the wallet starts on. */
    chainId: number;
    /** The active account's address (undefined while there is none). */
    address?: string;
    children?: React.ReactNode;
}
export default function BrowserProviders({ chainId, address, children }: BrowserProvidersProps): React.FunctionComponentElement<import("@tanstack/react-query").QueryClientProviderProps>;
