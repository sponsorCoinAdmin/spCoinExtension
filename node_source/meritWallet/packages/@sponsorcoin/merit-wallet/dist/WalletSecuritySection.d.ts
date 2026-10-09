import React from 'react';
export interface WalletSecurityApi {
    /** Resolve with the account's private key; throw a readable message for a wrong password. */
    revealPrivateKey(password: string, address: string): Promise<string>;
    /** Resolve with the Secret Recovery Phrase; throw a readable message for a wrong password. Omit to hide that row. */
    revealPhrase?(password: string): Promise<string>;
}
export default function WalletSecuritySection({ api }: {
    api: WalletSecurityApi;
}): React.JSX.Element;
