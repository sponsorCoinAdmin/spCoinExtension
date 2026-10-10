import type { AccountFormData, AccountMode } from './formTypes';
interface Params {
    connected: boolean;
    publicKey: string;
    accountExists: boolean;
    formData: AccountFormData;
    baselineData: AccountFormData;
    logoFile: File | null;
    isLoadingAccount: boolean;
    isSaving: boolean;
}
export declare function useAccountFormDerivedState({ connected, publicKey, accountExists, formData, baselineData, logoFile, isLoadingAccount, isSaving, }: Params): {
    publicKeyTrimmed: string;
    hasDataChanges: boolean;
    hasUnsavedChanges: boolean;
    accountMode: AccountMode;
    submitLabel: string;
    isRevertNoop: boolean;
    pageTitle: string;
    isLoading: boolean;
    isEditMode: boolean;
    isActive: boolean;
    canCreateMissingAccount: boolean;
    disableSubmit: boolean;
    disableRevert: boolean;
};
export {};
