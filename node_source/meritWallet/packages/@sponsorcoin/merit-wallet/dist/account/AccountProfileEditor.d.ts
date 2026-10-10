import React from 'react';
import type { ProfileFormData } from './profileForm';
export interface AccountProfileHost {
    /** The hosted app's origin ('' for the same origin). */
    baseUrl: string;
    /** May the wallet sign for this account (is it one of its own)? Others are shown read-only. */
    canEdit(address: string): boolean;
    /** Sign the server's challenge with the account (personal_sign); throw a readable message on rejection. */
    signMessage(address: string, message: string): Promise<string>;
    /** Called after a successful save with what was saved, so the host can update (or drop) its cached copy of the profile. `avatarChanged` is true when a new image was uploaded. */
    onSaved?(address: string, saved: ProfileFormData, avatarChanged: boolean): void;
}
export interface AccountProfileInitial extends Partial<ProfileFormData> {
    avatarSrc?: string;
    recipientNetwork?: number[];
}
export default function AccountProfileEditor({ address, initial, host, onDone, }: {
    address: string;
    initial: AccountProfileInitial;
    /** Kept for the callers' sake: whether the account has a profile is now read from the server by the shared hook. */
    exists?: boolean;
    host: AccountProfileHost;
    onDone(): void;
}): React.JSX.Element;
