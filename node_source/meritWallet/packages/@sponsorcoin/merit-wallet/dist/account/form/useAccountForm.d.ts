import type { AccountFormData, AccountFormField } from './formTypes';
/** The part of saving an account that differs per host. */
export interface AccountFormHost {
    /** Origin of the hosted API for the sign-in calls ('' = same origin, as in the web app). */
    baseUrl?: string;
    /** The account that signs a save for `target` (`active` = the connected account, if any): its address and a personal_sign function. Throw a readable Error when none is available. */
    signIn(target: string, active: string): Promise<{
        signerAddress: string;
        signMessage(message: string): Promise<string>;
    }>;
    /** May this signer save this target's record? Default: only when they are the same account. */
    canEdit?(signer: string, target: string): boolean;
    /** Names the signer in the "Connected account mismatch" message. */
    signerLabel?: string;
    /** Turns the picked image into the avatar to upload (resize / contain / size limits). */
    processLogo(file: File): Promise<File>;
}
export interface UseAccountFormParams {
    connected: boolean;
    activeAddress?: string;
    targetAddress?: string;
    initialLogoURL?: string;
    /** A session exists without a connected wallet (the web app's Hardhat keystore on chain 31337); the loaded selection is then kept when no address is set. */
    sessionWithoutConnection?: boolean;
    host: AccountFormHost;
}
export declare function useAccountForm({ connected, activeAddress, targetAddress, initialLogoURL, sessionWithoutConnection, host }: UseAccountFormParams): {
    publicKeyTrimmed: string;
    hasDataChanges: boolean;
    hasUnsavedChanges: boolean;
    accountMode: import("./formTypes").AccountMode;
    submitLabel: string;
    isRevertNoop: boolean;
    pageTitle: string;
    isLoading: boolean;
    isEditMode: boolean;
    isActive: boolean;
    canCreateMissingAccount: boolean;
    disableSubmit: boolean;
    disableRevert: boolean;
    publicKey: string;
    formData: AccountFormData;
    errors: Partial<Record<"publicKey" | AccountFormField, string>>;
    accountExists: boolean;
    isLoadingAccount: boolean;
    isSaving: boolean;
    logoFileInputRef: import("react").RefObject<HTMLInputElement>;
    descriptionTextareaRef: import("react").MutableRefObject<HTMLTextAreaElement | null>;
    serverLogoURL: string;
    setFormData: import("react").Dispatch<import("react").SetStateAction<AccountFormData>>;
    setErrors: import("react").Dispatch<import("react").SetStateAction<Partial<Record<"publicKey" | AccountFormField, string>>>>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleFieldBlur: (field: AccountFormField) => void;
    handlePublicKeyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handlePublicKeyBlur: () => Promise<void>;
    handleSelectPublicKey: (nextAddress: string) => Promise<void>;
    handleRevertChanges: () => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handleLogoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    logoPreviewSrc: string;
    invalidAddressPopupPreviousAddress: string | null;
    handleInvalidAddressContinue: () => void;
    handleInvalidAddressRevert: () => void;
};
