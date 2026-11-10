// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AccountDetailScreen.tsx
//
// docs/meritMigration.txt row 14 -- the account detail screen of the wallet (avatar, the profile table with the role chips, the Private Key row, the sponsored and staked amounts), written once in the package. It was the web app's
// AccountPanelContent: the same screen now reaches every app that imports the wallet. What differs per app comes in through AccountDetailHost, which is data and functions only: how a save is signed (the web app's keystore or
// MetaMask, the extension's vault), whether the wallet may edit right now, how a key is revealed, and how to connect a wallet. The role (the active account, a sponsor, a recipient, an agent) picks which pair of panel-tree flags
// shows the avatar and the table.
'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { accountDetailStyle } from '@sponsorcoin/spcoin-common/styles';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { RoleTableComponent, SponsoredAmountLine, StakedAmountReceivedLine } from '@sponsorcoin/spcoin-panels';
import { useAccountForm } from './form/useAccountForm';
import AccountFormPanel from './form/AccountFormPanel';
import DetailScreenLayout from './DetailScreenLayout';
import AccountPrivateKeyRow, { HeldPrivateKeyRow } from './AccountPrivateKeyRow';
import RemoveAccountPanel from './RemoveAccountPanel';
/** The avatar and table flags of a role: each role has its own pair, so toggling one in the panel tree does not affect the others. */
export function flagsForRole(role) {
    if (role === SP_COIN_DISPLAY.AGENT_ACCOUNT)
        return [SP_COIN_DISPLAY.AGENT_LOGO, SP_COIN_DISPLAY.AGENT_META_DATA];
    if (role === SP_COIN_DISPLAY.SPONSOR_ACCOUNT)
        return [SP_COIN_DISPLAY.SPONSOR_LOGO, SP_COIN_DISPLAY.SPONSOR_META_DATA];
    if (role === SP_COIN_DISPLAY.RECIPIENT_ACCOUNT)
        return [SP_COIN_DISPLAY.RECIPIENT_LOGO, SP_COIN_DISPLAY.RECIPIENT_META_DATA];
    return [SP_COIN_DISPLAY.ACCOUNT_LOGO, SP_COIN_DISPLAY.ACCOUNT_META_DATA];
}
export default function AccountDetailScreen({ account, role = SP_COIN_DISPLAY.ACTIVE_ACCOUNT, host }) {
    const [logoFlag, metaDataFlag] = flagsForRole(role);
    const address = String(account?.address ?? '').trim();
    const symbol = account?.symbol;
    // the host's source question is asked again for each account shown (the host object is rebuilt every render, so only the address starts a new ask)
    const hostRef = useRef(host);
    hostRef.current = host;
    const [source, setSource] = useState(undefined);
    useEffect(() => {
        let cancelled = false;
        const ask = hostRef.current.accountSource;
        if (!ask || !address)
            return undefined;
        void ask(address, symbol)
            .then((value) => { if (!cancelled)
            setSource({ address, value }); })
            .catch(() => { if (!cancelled)
            setSource({ address, value: undefined }); });
        return () => {
            cancelled = true;
        };
    }, [address, symbol, host.accountSource ? host.activeAddress : undefined]);
    const accountSource = source && source.address.toLowerCase() === address.toLowerCase() ? source.value : undefined;
    const editable = host.canEdit ? host.canEdit(address) : host.connected;
    const signer = host.canEdit ? address : host.activeAddress;
    const form = useAccountForm({
        connected: editable,
        activeAddress: signer,
        targetAddress: address,
        initialLogoURL: account?.logoURL,
        sessionWithoutConnection: host.sessionWithoutConnection,
        host: host.form,
    });
    if (!account)
        return null;
    const loadingInputMessage = 'Loading or updating account data. Input is temporarily disabled.';
    const reveal = host.revealPrivateKey;
    const showKeyRow = !!reveal && (host.canReveal ? host.canReveal(address) : true);
    // 2026-11-09 (owner): the layout (body, the two blocks, the scalable image, the button box with the toggle) is DetailScreenLayout's, shared with the Token and Network screens; this screen supplies the editable form
    return (_jsx(DetailScreenLayout, { screenId: "ACCOUNT_INFO", onSubmit: form.handleSubmit, activeBody: role === SP_COIN_DISPLAY.ACTIVE_ACCOUNT, resizeKey: String(role), logoFlag: logoFlag, metaFlag: metaDataFlag, logoId: "ACCOUNT_LOGO", metaId: "ACCOUNT_META_DATA", toggleTrace: "AccountDetailScreen:toggleAccountMeta", avatar: {
            logoPreviewSrc: form.logoPreviewSrc,
            connected: editable,
            isEditMode: form.isEditMode,
            inputLocked: !form.isEditMode,
            previewButtonLabel: 'Select Preview Image',
            loadingInputMessage,
            isLoading: form.isLoading,
            logoFileInputRef: form.logoFileInputRef,
            onFileChange: form.handleLogoFileChange,
            toggleLabel: 'Account Meta', imageKind: 'account',
        }, meta: ({ logoVisible }) => (_jsxs(_Fragment, { children: [_jsx(AccountFormPanel, { panelMarginClass: logoVisible ? 'mb-0 !h-auto !pt-0' : 'mb-0 !h-auto', accountPanelBorderClass: "", contentWidthClass: "max-w-[56rem]", idPrefix: "account-component-", formHeading: "", connected: editable, publicKey: form.publicKey, publicKeyLocked: true, formData: form.formData, errors: form.errors, descriptionTextareaRef: form.descriptionTextareaRef, inputLocked: !form.isEditMode, isLoading: form.isLoading, loadingInputMessage: loadingInputMessage, isSaving: form.isSaving, isEditMode: form.isEditMode, submitLabel: form.submitLabel, hasUnsavedChanges: form.hasUnsavedChanges, canCreateMissingAccount: form.canCreateMissingAccount, disableSubmit: form.disableSubmit, disableRevert: form.disableRevert, isRevertNoop: form.isRevertNoop, onPublicKeyChange: form.handlePublicKeyChange, onPublicKeyBlur: form.handlePublicKeyBlur, onChange: form.handleChange, onFieldBlur: form.handleFieldBlur, onRevert: form.handleRevertChanges, roleTable: _jsx(RoleTableComponent, { account: account, accountAddress: address }), privateKeyRow: accountSource?.heldBy ? (style) => _jsx(HeldPrivateKeyRow, { heldBy: accountSource.heldBy, ...style }) : showKeyRow ? (style) => _jsx(AccountPrivateKeyRow, { address: address, reveal: reveal, idPrefix: "account-component-", ...style }) : undefined, connectButton: host.connectWallet ? (_jsx("button", { type: "button", onClick: host.connectWallet, style: accountDetailStyle.connect, children: "Connect Wallet" })) : undefined, footer: accountSource?.removal ? _jsx(RemoveAccountPanel, { removal: accountSource.removal, account: { address, name: account.name, symbol: account.symbol, logoURL: account.logoURL }, onRemoved: () => host.onAccountRemoved?.(address) }) : undefined }), _jsx(SponsoredAmountLine, { account: account }), _jsx(StakedAmountReceivedLine, { account: account })] })) }));
}
