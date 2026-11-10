import React from 'react';
export interface AccountDisplayDropDownProps {
    address: string;
    name?: string;
    symbol?: string;
    logoURL?: string;
}
export default function AccountDisplayDropDown({ address, name, symbol, logoURL }: AccountDisplayDropDownProps): React.JSX.Element;
