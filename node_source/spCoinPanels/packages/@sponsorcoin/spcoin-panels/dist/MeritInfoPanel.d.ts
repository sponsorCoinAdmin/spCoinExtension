import React from 'react';
export interface MeritInfoRow {
    label: string;
    value: React.ReactNode;
}
export interface MeritInfoPanelProps {
    /** Logo card shown above the rows — omit for no image. */
    icon?: React.ReactNode;
    rows?: MeritInfoRow[];
}
export default function MeritInfoPanel({ icon, rows }: MeritInfoPanelProps): React.JSX.Element;
