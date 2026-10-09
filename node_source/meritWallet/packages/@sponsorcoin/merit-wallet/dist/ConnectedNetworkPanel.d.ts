import React from 'react';
import type { NetworkElement } from '@sponsorcoin/spcoin-common/context';
/** A NetworkElement for a chain id straight from the registry (the default for previewing a chain other than the live one). */
export declare function networkElementFromRegistry(chainId: number): NetworkElement;
export interface LiveNetwork {
    network: NetworkElement & Record<string, unknown>;
    chainId: number;
}
/** Default live network: the exchange context's network, filled in from the registry the way the web app's useNetwork fills it from its helpers. */
export declare function useLiveNetworkFromContext(): LiveNetwork;
export interface ConnectedNetworkPanelProps {
    onClose?: () => void;
    /** Host hook for the live network (stable module-level function). Default: the exchange context filled from the registry. */
    useLiveNetwork?: () => LiveNetwork;
}
export default function ConnectedNetworkPanel({ useLiveNetwork }: ConnectedNetworkPanelProps): React.JSX.Element | null;
