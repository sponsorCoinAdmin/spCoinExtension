import React from 'react';
import { type AssetPreviewRowProps } from '@sponsorcoin/spcoin-panels';
export interface AddressPanelProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** The row under the bar. Omit while there is nothing to show. */
    preview?: AssetPreviewRowProps | null;
}
export default function AddressPanel({ value, onChange, placeholder, preview, }: AddressPanelProps): React.JSX.Element;
