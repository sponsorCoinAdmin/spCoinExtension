import type { ProfileFormData } from './profileForm';
import type { AccountDetailHost } from './AccountDetailScreen';
/** What a host that signs profile saves itself provides (the extension: its vault signs the server's challenge). */
export interface AccountProfileHost {
    /** May the wallet sign for this account (is it one of its own)? Others are shown read-only. */
    canEdit(address: string): boolean;
    /** Sign the server's challenge with the account (personal_sign); throw a readable message on rejection. */
    signMessage(address: string, message: string): Promise<string>;
    /** Called after a successful save with what was saved, so the host can update (or drop) its cached copy of the profile. `avatarChanged` is true when a new image was uploaded. */
    onSaved?(address: string, saved: ProfileFormData, avatarChanged: boolean): void;
    /** The account's avatar as the host's image cache holds it (the single source of truth for avatars). */
    resolveAvatar?(address: string): Promise<string | undefined>;
    /** The picked image was published: keep it in the host's image cache. */
    onLogoSaved?(address: string, file: File): void;
}
export interface AccountProfileInitial extends Partial<ProfileFormData> {
    avatarSrc?: string;
    recipientNetwork?: number[];
}
export declare function accountDetailHostFromProfile(profile: AccountProfileHost, extra?: {
    revealPrivateKey?: AccountDetailHost['revealPrivateKey'];
    canReveal?: AccountDetailHost['canReveal'];
}): AccountDetailHost;
