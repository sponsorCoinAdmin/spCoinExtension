import { type ProfileFormData } from './profileForm';
export interface SaveAccountProfileParams {
    baseUrl: string;
    address: string;
    fields: ProfileFormData;
    /** The account is already registered (PUT) or new (POST). */
    exists: boolean;
    /** Save the text fields (skip when only the image changed). */
    saveFields?: boolean;
    /** The record's recipientNetwork (chain ids), kept as it is: the server REPLACES account.json with the body, so a field left out would be lost. */
    recipientNetwork?: number[];
    /** A new avatar to upload (already processed). */
    logo?: Blob | null;
    /** Sign the server's challenge with the account (personal_sign); throw a readable message on rejection. */
    signMessage(message: string): Promise<string>;
    fetchImpl?: typeof fetch;
}
export declare function saveAccountProfile(params: SaveAccountProfileParams): Promise<void>;
