import React from 'react';
export interface AccountDetailPanelProps {
    address: string;
    avatarSrc?: string;
    name?: string;
    symbol?: string;
    email?: string;
    website?: string;
    description?: string;
    /** True while the caller's own metadata/avatar fetch is still in
     *  flight — shows a plain "Loading…" row per field instead of nothing,
     *  same as AssetListTable's own loading convention. */
    loading?: boolean;
}
export default function AccountDetailPanel({ address, avatarSrc, name, symbol, email, website, description, loading, }: AccountDetailPanelProps): React.JSX.Element;
