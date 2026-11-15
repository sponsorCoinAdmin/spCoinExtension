import React from 'react';
export interface MetaDataRow {
    label: string;
    value: React.ReactNode;
}
export interface ReadOnlyMetaDataTableProps {
    rows: MetaDataRow[];
    logoURL?: string;
    logoAlt?: string;
    logoVisible?: boolean;
    id?: string;
    className?: string;
    logoBackgroundClassName?: string;
    logoContainerClassName?: string;
    logoRoundedClassName?: string;
    logoContainerSizeClassName?: string;
    logoSizeClassName?: string;
}
export default function ReadOnlyMetaDataTable({ rows, logoURL, logoAlt, logoVisible, id, className, logoBackgroundClassName, logoContainerClassName, logoRoundedClassName, logoContainerSizeClassName, logoSizeClassName, }: ReadOnlyMetaDataTableProps): React.JSX.Element;
