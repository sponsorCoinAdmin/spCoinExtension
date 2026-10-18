import React from 'react';
/** Thrown by a host's revealPrivateKey when it needs the wallet password (none given, or the cached one no longer works). */
export declare class PasswordRequiredError extends Error {
    constructor(message?: string);
}
export declare const isPasswordRequired: (error: unknown) => boolean;
export default function AccountPrivateKeyRow({ address, reveal, idPrefix, zebra, cell, }: {
    address: string;
    /** The host's reveal: with no password it may succeed from an approved cached one, else it throws PasswordRequiredError; a wrong password throws a readable Error. */
    reveal(address: string, password?: string): Promise<string>;
    idPrefix?: string;
    zebra: string;
    cell: string;
}): React.JSX.Element;
