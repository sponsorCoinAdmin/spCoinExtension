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
    privateKeyRow?: (classes: {
        zebra: string;
        cell: string;
    }) => React.ReactNode;
    /** The host's Connect button, shown instead of the Save / Revert buttons while not connected. */
    connectButton?: React.ReactNode;
    /** Anything the host needs after the table (the web app's password modal for the private key). */
    footer?: React.ReactNode;
    /** 2026-11-09 (owner: no unnecessary wrappers): no box of its own: the heading (if any), the table and the footer are returned as they are, to be placed in the base layout's table block. The table is one element, a flex item of that block. */
    bare?: boolean;
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
    /** The words of the second button. Default "Revert Changes"; the Add New Account screen says "Cancel". */
    revertLabel?: string;
}
export default function CreateAccountFormPanel({ panelMarginClass, accountPanelBorderClass, contentWidthClass, idPrefix, formHeading, topRowContent, connected, publicKey, publicKeyLocked, roleTable, privateKeyRow, connectButton, footer, bare, formData, errors, descriptionTextareaRef, inputLocked, isLoading, loadingInputMessage, isSaving, isEditMode, submitLabel, hasUnsavedChanges, canCreateMissingAccount, disableSubmit, disableRevert, isRevertNoop, errorValueDisplay, onPublicKeyChange, onPublicKeyBlur, onChange, onFieldBlur, onRevert, revertLabel, }: Props): React.JSX.Element;
export {};
