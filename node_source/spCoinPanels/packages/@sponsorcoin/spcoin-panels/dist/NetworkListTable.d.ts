import React from 'react';
import { type NetworkListRowProps } from './NetworkListRow';
export declare const NETWORK_LIST_ROW_BG_A = "rgba(56,78,126,0.35)";
export declare const NETWORK_LIST_ROW_BG_B = "rgba(156,163,175,0.25)";
export interface NetworkListEntry extends NetworkListRowProps {
    /** React key — typically the row's own chainId. */
    id: string;
}
export interface NetworkListTableProps {
    rows: NetworkListEntry[];
    showTestNets?: boolean;
    onToggleShowTestNets?: () => void;
    loadingText?: string;
    emptyText?: string;
    loading?: boolean;
}
export default function NetworkListTable({ rows, showTestNets, onToggleShowTestNets, loadingText, emptyText, loading, }: NetworkListTableProps): React.JSX.Element;
