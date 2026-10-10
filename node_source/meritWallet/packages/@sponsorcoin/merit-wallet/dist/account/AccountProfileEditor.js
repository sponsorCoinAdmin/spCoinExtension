// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AccountProfileEditor.tsx
//
// 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 18) -- edit an account's public profile from inside the wallet. It is now the SAME editor the web app uses: the shared useAccountForm hook with the shared
// AccountFormPanel / AccountAvatarPanel (src/account/form), over a host: the hosted app's address, whether the wallet owns the account, and how the account signs the server's challenge. It replaces the
// smaller inline-styled form this file held before, so a rule or a field added to the editor reaches both apps. The record is read and saved through the engine's account store, pointed at host.baseUrl.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef } from 'react';
import { setAccountStoreBaseUrl } from '@sponsorcoin/spcoin-exchange-engine';
import { processLogoFile } from './logoImage';
import { useAccountForm } from './form/useAccountForm';
import AccountFormPanel from './form/AccountFormPanel';
import AccountAvatarPanel from './form/AccountAvatarPanel';
const buttonStyle = { flex: 1, borderRadius: 8, border: 'none', padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#243056', color: '#ffffff' };
export default function AccountProfileEditor({ address, initial, host, onDone, }) {
    useEffect(() => setAccountStoreBaseUrl(host.baseUrl), [host.baseUrl]);
    const editable = host.canEdit(address);
    const hostRef = useRef(host);
    hostRef.current = host;
    const formHost = useMemo(() => ({
        baseUrl: host.baseUrl,
        signerLabel: 'This wallet',
        processLogo: async (file) => new File([await processLogoFile(file)], 'avatar.png', { type: 'image/png' }),
        async signIn(target) {
            if (!hostRef.current.canEdit(target))
                throw new Error("This account is not one of this wallet's, so it cannot be edited here.");
            return { signerAddress: target, signMessage: (message) => hostRef.current.signMessage(target, message) };
        },
    }), [host.baseUrl]);
    const form = useAccountForm({ connected: editable, activeAddress: address, targetAddress: address, initialLogoURL: initial.avatarSrc, host: formHost });
    const savedOnce = useRef(false);
    useEffect(() => {
        // After a save the form's baseline equals what was typed; tell the host once per save so it refreshes its cached copy.
        if (!form.isSaving && form.accountExists && !form.hasUnsavedChanges && savedOnce.current) {
            savedOnce.current = false;
            host.onSaved?.(address, form.formData, true);
        }
        if (form.isSaving)
            savedOnce.current = true;
    }, [form.isSaving, form.accountExists, form.hasUnsavedChanges, form.formData, address, host]);
    const loadingInputMessage = 'Loading account…';
    return (_jsxs("form", { onSubmit: form.handleSubmit, style: { display: 'flex', flexDirection: 'column', gap: 10, padding: 12, color: '#fff' }, children: [_jsx(AccountAvatarPanel, { panelMarginClass: "", avatarPanelBorderClass: "", avatarHeading: form.formData.name.trim() ? `${form.formData.name.trim()}'s Avatar` : 'Avatar', logoPreviewSrc: form.logoPreviewSrc, connected: editable, isEditMode: form.isEditMode, inputLocked: !form.isActive, previewButtonLabel: "Select Preview Image", loadingInputMessage: loadingInputMessage, isLoading: form.isLoading, acceptedInput: "image/*", maxPreviewSize: 120, minPreviewSize: 80, logoFileInputRef: form.logoFileInputRef, onFileChange: form.handleLogoFileChange }), _jsx(AccountFormPanel, { panelMarginClass: "", accountPanelBorderClass: "", contentWidthClass: "max-w-none", idPrefix: "wallet-edit-", formHeading: "", connected: editable, publicKey: form.publicKey, publicKeyLocked: true, formData: form.formData, errors: form.errors, descriptionTextareaRef: form.descriptionTextareaRef, inputLocked: !form.isActive, isLoading: form.isLoading, loadingInputMessage: loadingInputMessage, isSaving: form.isSaving, isEditMode: form.isEditMode, submitLabel: form.submitLabel, hasUnsavedChanges: form.hasUnsavedChanges, canCreateMissingAccount: form.canCreateMissingAccount, disableSubmit: form.disableSubmit, disableRevert: form.disableRevert, isRevertNoop: form.isRevertNoop, onPublicKeyChange: form.handlePublicKeyChange, onPublicKeyBlur: form.handlePublicKeyBlur, onChange: form.handleChange, onFieldBlur: form.handleFieldBlur, onRevert: form.handleRevertChanges, connectButton: _jsx("p", { style: { margin: 0, padding: 10, fontSize: 11, color: '#94a3b8', textAlign: 'center' }, children: "This account is not one of this wallet's, so it cannot be edited here." }) }), _jsx("div", { style: { display: 'flex', gap: 8 }, children: _jsx("button", { type: "button", onClick: onDone, style: buttonStyle, children: "Back" }) })] }));
}
