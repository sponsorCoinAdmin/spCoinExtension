import React from 'react';
import type { AccountFormData, AccountFormErrors, AccountFormField } from './formTypes';
interface Props {
    panelMarginClass: string;
    accountPanelBorderClass: string;
    contentWidthClass?: string;
    idPrefix?: string;
    formHeading?: string;
    topRowContent?: React.ReactNode;
    connected: boolean;
    publicKey: string;
    publicKeyLocked?: boolean;
    /** The host's role chips (RoleTableComponent in the web app), shown on the right of the "Value" header. */
    roleTable?: React.ReactNode;
    /** The host's Private Key row (the web app's reveal / one-time-key row), rendered as table cells; it is given the zebra and cell classes of this table. Optional: the extension shows none. */
    privateKeyRow?: (style: {
        zebra: string;
        cell: string;
    }) => React.ReactNode;
    /** The host's Connect button, shown instead of the Save / Revert buttons while not connected. */
    connectButton?: React.ReactNode;
    /** Anything the host needs after the table (the web app's password modal for the private key). */
    footer?: React.ReactNode;
    formData: AccountFormData;
    errors: AccountFormErrors;
    descriptionTextareaRef: React.RefObject<HTMLTextAreaElement>;
    inputLocked: boolean;
    isLoading: boolean;
    loadingInputMessage: string;
    isSaving: boolean;
    isEditMode: boolean;
    submitLabel: string;
    hasUnsavedChanges: boolean;
    canCreateMissingAccount: boolean;
    disableSubmit: boolean;
    disableRevert: boolean;
    isRevertNoop: boolean;
    errorValueDisplay?: boolean;
    onPublicKeyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPublicKeyBlur: () => void | Promise<void>;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onFieldBlur: (field: AccountFormField) => void;
    onRevert: () => void;
}
export default function CreateAccountFormPanel({ panelMarginClass, accountPanelBorderClass, contentWidthClass, idPrefix, formHeading, topRowContent, connected, publicKey, publicKeyLocked, roleTable, privateKeyRow, connectButton, footer, formData, errors, descriptionTextareaRef, inputLocked, isLoading, loadingInputMessage, isSaving, isEditMode, submitLabel, hasUnsavedChanges, canCreateMissingAccount, disableSubmit, disableRevert, isRevertNoop, errorValueDisplay, onPublicKeyChange, onPublicKeyBlur, onChange, onFieldBlur, onRevert, }: Props): React.JSX.Element;
export {};
