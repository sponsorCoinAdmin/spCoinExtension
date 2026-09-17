export interface TokenDetailPanelProps {
    address: string;
    logoSrc?: string;
    name?: string;
    symbol?: string;
    decimals?: number;
    website?: string;
    explorer?: string;
    description?: string;
    /** True while the caller's own metadata/logo fetch is still in flight —
     *  same convention as AccountDetailPanel's own `loading`. */
    loading?: boolean;
}
export default function TokenDetailPanel({ address, logoSrc, name, symbol, decimals, website, explorer, description, loading, }: TokenDetailPanelProps): import("react/jsx-runtime").JSX.Element;
