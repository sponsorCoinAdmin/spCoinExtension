import React from 'react';
export interface SendToAddressComponentProps {
    value: string;
    onChange: (v: string) => void;
}
export default function SendToAddressComponent({ value, onChange }: SendToAddressComponentProps): React.JSX.Element;
