export interface AccountFormData {
    name: string;
    symbol: string;
    email: string;
    website: string;
    description: string;
    recipientNetwork: number[];
}
export type AccountFormField = 'name' | 'symbol' | 'email' | 'website' | 'description';
export type AccountFormErrors = Partial<Record<AccountFormField | 'publicKey', string>>;
export type AccountMode = 'create' | 'edit' | 'update';
