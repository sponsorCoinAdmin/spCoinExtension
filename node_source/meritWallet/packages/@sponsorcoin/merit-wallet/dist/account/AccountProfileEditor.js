// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AccountProfileEditor.tsx
//
// 2026-10-09 -- edit an account's public profile (name, symbol, email, website, description, avatar) from inside the wallet, written once for both hosts. The web app's
// version is components/views/RadioOverlayPanels/AccountPanel/AccountPanelContent.tsx over app/(menu)/(dynamic)/(accounts)/CreateAccount (a 770-line hook plus form
// panels bound to the web's wallet, wagmi and Next router); this is the same form, rules and save sequence over a host: it supplies the hosted app's address and how
// the account signs the server's challenge. The rules are profileForm.ts and the save is accountProfileClient.ts (both tested); the avatar is processed in the
// browser to the 400 x 400 PNG the server stores. Inline styles only, so it renders the same in both apps.
'use client';
import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import { walletColors } from '@sponsorcoin/spcoin-common/styles';
import { saveAccountProfile } from './accountProfileClient';
import { processLogoFile } from './logoImage';
import { FIELD_MAX_LENGTHS, PROFILE_FIELDS, profileChanged, trimProfile, validateProfile, validateProfileField } from './profileForm';
const LABELS = { name: 'Name', symbol: 'Symbol', email: 'Email', website: 'Website', description: 'Description' };
const PLACEHOLDERS = {
    name: 'Account name, e.g. "Save the World"',
    symbol: 'Symbol, e.g. "WORLD"',
    email: 'Email (not a personal one)',
    website: 'Website URL',
    description: 'Description',
};
const inputStyle = {
    boxSizing: 'border-box',
    width: '100%',
    borderRadius: 8,
    border: '1px solid #334155',
    background: '#0b0e17',
    padding: '8px 10px',
    color: '#fff',
    font: 'inherit',
    fontSize: 12,
    outline: 'none',
};
const buttonStyle = (primary, disabled) => ({
    flex: 1,
    borderRadius: 8,
    border: 'none',
    padding: '9px 0',
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    background: primary ? '#5981F3' : walletColors.panel,
    color: '#ffffff',
});
export default function AccountProfileEditor({ address, initial, exists, host, onDone, }) {
    const baseline = useMemo(() => ({ name: initial.name ?? '', symbol: initial.symbol ?? '', email: initial.email ?? '', website: initial.website ?? '', description: initial.description ?? '' }), [initial.name, initial.symbol, initial.email, initial.website, initial.description]);
    const editable = host.canEdit(address);
    const [form, setForm] = useState(baseline);
    const [saved, setSaved] = useState(baseline);
    const [errors, setErrors] = useState({});
    const [logo, setLogo] = useState(null);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState(null);
    const [existsNow, setExistsNow] = useState(exists);
    const fileRef = useRef(null);
    const dirty = profileChanged(form, saved);
    const canSave = editable && !busy && (dirty || !!logo || !existsNow);
    const setField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setStatus(null);
        const error = validateProfileField(field, value);
        setErrors((current) => {
            const next = { ...current };
            if (error)
                next[field] = error;
            else
                delete next[field];
            return next;
        });
    };
    const onPickFile = async (file) => {
        if (!file)
            return;
        setStatus(null);
        try {
            const processed = await processLogoFile(file);
            setLogo({ blob: processed, preview: URL.createObjectURL(processed) });
        }
        catch (error) {
            setLogo(null);
            setStatus({ ok: false, text: error instanceof Error ? error.message : 'Unable to process image upload' });
        }
    };
    const save = async () => {
        const found = validateProfile(trimProfile(form));
        setErrors(found);
        if (Object.keys(found).length > 0)
            return;
        setBusy(true);
        setStatus(null);
        try {
            const saveFields = dirty || !existsNow;
            await saveAccountProfile({
                baseUrl: host.baseUrl,
                address,
                fields: form,
                exists: existsNow,
                saveFields,
                logo: logo?.blob ?? null,
                recipientNetwork: initial.recipientNetwork,
                signMessage: (message) => host.signMessage(address, message),
            });
            if (saveFields) {
                setSaved(trimProfile(form));
                setExistsNow(true);
            }
            setStatus({ ok: true, text: saveFields && logo ? 'Account metadata and image updated successfully' : saveFields ? 'Account metadata updated successfully' : 'Account image updated successfully' });
            host.onSaved?.(address, trimProfile(form), !!logo);
        }
        catch (error) {
            setStatus({ ok: false, text: error instanceof Error ? error.message : 'Failed to save account' });
        }
        finally {
            setBusy(false);
        }
    };
    const avatar = logo?.preview ?? initial.avatarSrc;
    return (_jsxs("form", { onSubmit: (e) => {
            e.preventDefault();
            if (canSave)
                void save();
        }, style: { display: 'flex', flexDirection: 'column', gap: 10, padding: 12, color: '#fff' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden', background: '#11162A', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: avatar ? _jsx("img", { src: avatar, alt: "", style: { width: '100%', height: '100%', objectFit: 'contain' } }) : null }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }, children: [_jsx("span", { style: { fontSize: 10, color: '#94a3b8', wordBreak: 'break-all' }, children: address }), editable && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", disabled: busy, onClick: () => fileRef.current?.click(), style: { ...buttonStyle(false, busy), flex: 'none', padding: '6px 10px' }, children: "Select Preview Image" }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", hidden: true, onChange: (e) => void onPickFile(e.target.files?.[0]) })] }))] })] }), PROFILE_FIELDS.map((field) => (_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 3 }, children: [_jsx("span", { style: { fontSize: 10, color: '#94a3b8' }, children: LABELS[field] }), field === 'description' ? (_jsx("textarea", { value: form[field], placeholder: PLACEHOLDERS[field], disabled: !editable || busy, rows: 3, maxLength: FIELD_MAX_LENGTHS[field] + 1, onChange: (e) => setField(field, e.target.value), style: { ...inputStyle, resize: 'vertical' } })) : (_jsx("input", { value: form[field], placeholder: PLACEHOLDERS[field], disabled: !editable || busy, maxLength: FIELD_MAX_LENGTHS[field] + 1, onChange: (e) => setField(field, e.target.value), style: { ...inputStyle, borderColor: errors[field] ? '#f87171' : '#334155' } })), errors[field] && _jsx("span", { style: { fontSize: 10, color: '#f87171' }, children: errors[field] })] }, field))), status && _jsx("p", { style: { margin: 0, fontSize: 11, color: status.ok ? '#4ade80' : '#f87171' }, children: status.text }), !editable && _jsx("p", { style: { margin: 0, fontSize: 11, color: '#94a3b8' }, children: "This account is not one of this wallet's, so it cannot be edited here." }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { type: "button", onClick: onDone, style: buttonStyle(false, false), children: "Back" }), editable && (_jsx("button", { type: "button", disabled: busy || (!dirty && !logo), onClick: () => {
                            setForm(saved);
                            setLogo(null);
                            setErrors({});
                            setStatus(null);
                        }, style: buttonStyle(false, busy || (!dirty && !logo)), children: "Revert" })), editable && (_jsx("button", { type: "submit", disabled: !canSave, style: buttonStyle(true, !canSave), children: busy ? 'Saving…' : existsNow ? 'Save' : 'Create Account' }))] })] }));
}
