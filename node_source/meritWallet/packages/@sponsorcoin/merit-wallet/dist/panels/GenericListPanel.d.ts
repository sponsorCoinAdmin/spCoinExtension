import React from 'react';
export interface GenericListRow {
    icon?: React.ReactNode;
    primary: string;
    secondary?: string;
    trailing?: string;
}
export interface GenericListPanelProps {
    searchPlaceholder?: string;
    /** Omit for no search box at all (e.g. panels with no filter of their own). */
    showSearch?: boolean;
    rows?: GenericListRow[];
    emptyText?: string;
}
export default function GenericListPanel({ searchPlaceholder, showSearch, rows, emptyText, }: GenericListPanelProps): React.JSX.Element;
