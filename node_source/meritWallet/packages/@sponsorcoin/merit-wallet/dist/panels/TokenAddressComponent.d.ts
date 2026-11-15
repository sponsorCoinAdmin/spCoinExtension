import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export interface TokenAddressComponentProps {
    panelId?: SP_COIN_DISPLAY;
    address: string;
    symbol: string;
    name: string;
    blockchainName: string;
    icon: React.ReactNode;
    onSelectClick: (e: React.SyntheticEvent) => void;
}
export default function TokenAddressComponent({ panelId, address, symbol, name, blockchainName, icon, onSelectClick, }: TokenAddressComponentProps): React.JSX.Element | null;
