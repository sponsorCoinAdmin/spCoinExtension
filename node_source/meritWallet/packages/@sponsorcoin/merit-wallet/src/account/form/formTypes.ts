// File: src/account/form/formTypes.ts
//
// 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 18) -- the account editor form types. Moved from the web app's CreateAccount folder so the web app and the extension share one account editor.
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

export type HoverTarget = 'createAccount' | 'uploadLogo' | 'revertChanges' | null;
export type AccountMode = 'create' | 'edit' | 'update';

