import type { NetworkRecord, NetworkListRowData } from './types';
export interface ListConfiguredNetworksOptions {
    showTestNets?: boolean;
}
/**
 * Real app ordering (components/wallet/lib/networks.tsx): the active
 * network always sorts first regardless of section, then remaining
 * mainnets, then testnets (only when showTestNets). Callers that don't
 * pass activeChainId get the plain mainnets-then-testnets order.
 */
export declare function listConfiguredNetworks(options?: ListConfiguredNetworksOptions, activeChainId?: number): NetworkRecord[];
/** Plain mapper → NetworkListTable's row shape. */
export declare function toNetworkListEntries(records: NetworkRecord[], activeChainId?: number): NetworkListRowData[];
