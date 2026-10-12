import React from 'react';
import type { Wallet } from './wallet';
export default function AccountSigningSection({ wallet, address }: {
    wallet: Wallet;
    address: string | undefined;
}): React.JSX.Element;
