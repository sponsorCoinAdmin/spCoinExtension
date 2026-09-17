import { type AssetListRowProps } from './AssetListRow';
export declare const ASSET_LIST_ROW_BG_A = "rgba(56,78,126,0.35)";
export declare const ASSET_LIST_ROW_BG_B = "rgba(156,163,175,0.25)";
export interface AssetListEntry extends AssetListRowProps {
    /** React key — typically the row's own address. */
    id: string;
}
export interface AssetListTableProps {
    rows: AssetListEntry[];
    /** "Token Meta" by default — DataListSelect.tsx's own header always
     *  reads "Token Meta" regardless of feed type (accounts included), so
     *  this default matches that rather than varying per caller. */
    metaLabel?: string;
    loadingText?: string;
    emptyText?: string;
    loading?: boolean;
}
export default function AssetListTable({ rows, metaLabel, loadingText, emptyText, loading, }: AssetListTableProps): import("react/jsx-runtime").JSX.Element;
