import React from 'react';
/** WalletAccountListVisible (see the header comment). */
export declare function useWalletAccountListVisible(): boolean;
export interface WalletAccountSelectDropDownProps {
    icon?: React.ReactNode;
    address?: string;
    symbol?: string;
    name?: string;
    placeholderLabel?: string;
    /** The pill itself was clicked: the host toggles the account list. */
    onSelectClick?: () => void;
    /** The avatar was clicked: the host opens the account's detail screen. */
    onIconClick?: (address: string) => void;
}
export default function WalletAccountSelectDropDown({ icon, address, symbol, name, placeholderLabel, onSelectClick, onIconClick }: WalletAccountSelectDropDownProps): React.JSX.Element;
