import React from 'react';
export interface StandaloneProvidersProps {
    /** The chain the wallet starts on. */
    chainId: number;
    /** The active account's address (undefined while there is none). */
    address?: string;
    children?: React.ReactNode;
}
export default function StandaloneProviders({ chainId, address, children }: StandaloneProvidersProps): React.FunctionComponentElement<import("@tanstack/react-query").QueryClientProviderProps>;
