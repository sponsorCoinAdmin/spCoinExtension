// File: src/account/form/AccountFormPanel.tsx
//
// 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 18) -- the account editor's form table (address, name, symbol, email, website, description, Save / Revert), moved from the web app's CreateAccountFormPanel so the web app and
// the extension show one editor. What only the web app has comes in through slots: the role chips, the Private Key row (one-time key or click-to-reveal with a password step-up), the Connect button and the modal that row opens.
'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { accountFormClass } from '@sponsorcoin/spcoin-common/styles';
import { useState, useCallback } from 'react';
import { usePlatform } from '../../platform/platform';
import { useCopyFeedback } from '../../platform/useCopyFeedback';
import { Check } from 'lucide-react';
import { msTableTw } from '@sponsorcoin/spcoin-panels';
import { FIELD_PLACEHOLDERS, FIELD_TITLES, getAbsoluteFieldError, shouldOpenLinkFromInputClick, toPreviewHref, } from './formHelpers';
import CopyIcon from './CopyIcon';
export default function CreateAccountFormPanel({ panelMarginClass, accountPanelBorderClass, contentWidthClass = 'max-w-[56rem]', idPrefix = '', formHeading = 'Account Meta Data', topRowContent, connected, publicKey, publicKeyLocked = false, roleTable, privateKeyRow, connectButton, footer, formData, errors, descriptionTextareaRef, inputLocked, isLoading, loadingInputMessage, isSaving, isEditMode, submitLabel, hasUnsavedChanges, canCreateMissingAccount, disableSubmit, disableRevert, isRevertNoop, errorValueDisplay = false, onPublicKeyChange, onPublicKeyBlur, onChange, onFieldBlur, onRevert, }) {
    const [hoveredInput, setHoveredInput] = useState(null);
    const [hoveringLinkTextField, setHoveringLinkTextField] = useState(null);
    const [hoverTarget, setHoverTarget] = useState(null);
    const { copiedKey: copiedField, copy } = useCopyFeedback();
    const platform = usePlatform();
    const handleCopyAddress = useCallback(() => {
        if (!publicKey)
            return;
        copy(publicKey, 'address');
    }, [publicKey, copy]);
    const handleCopyField = useCallback((fieldName, value) => {
        if (!value)
            return;
        copy(value, fieldName);
    }, [copy]);
    const th = accountFormClass.th;
    const cell = accountFormClass.cell;
    const requiredInputClasses = accountFormClass.requiredInput;
    const optionalInputClasses = accountFormClass.optionalInput;
    const zebraA = accountFormClass.zebraA;
    const zebraB = accountFormClass.zebraB;
    const tableGrid = accountFormClass.tableGridRow;
    const disconnectedInputMessage = 'Connection Required and input is prohibited until connection is established.';
    const disconnectedMetaMaskMessage = 'MetaMask Connection Required';
    const errorValueClasses = errorValueDisplay ? accountFormClass.errorValue : '';
    const loadingFieldClasses = accountFormClass.loadingField;
    const lockedInputMessage = isLoading ? loadingInputMessage : disconnectedInputMessage;
    const noChangesToUpdate = submitLabel !== 'Create Account' && !hasUnsavedChanges;
    const getLoadingClassesForField = (fieldName) => isLoading && hoveredInput === fieldName ? loadingFieldClasses : '';
    const fieldId = (fieldName) => `${idPrefix}${fieldName}`;
    const formFieldRows = [
        { label: 'Name', name: 'name', labelTitle: FIELD_TITLES.name },
        { label: 'Symbol', name: 'symbol', labelTitle: FIELD_TITLES.symbol },
        { label: 'Email Address', name: 'email', labelTitle: FIELD_TITLES.email },
        { label: 'Website', name: 'website', labelTitle: FIELD_TITLES.website },
    ];
    return (_jsxs("section", { className: accountFormClass.section(panelMarginClass, accountPanelBorderClass), "data-account-form-ready": isLoading ? 'false' : 'true', children: [formHeading || topRowContent ? (_jsxs("div", { className: accountFormClass.headingBox(contentWidthClass), children: [formHeading ? (_jsxs("div", { className: accountFormClass.headingGrid, children: [_jsx("div", { className: accountFormClass.headingSpacer, children: "Address" }), _jsx("h2", { className: accountFormClass.heading, children: formHeading })] })) : null, topRowContent ? _jsx("div", { className: accountFormClass.topRow(!!formHeading), children: topRowContent }) : null] })) : null, _jsx("div", { className: accountFormClass.tableBox, children: _jsxs("div", { className: accountFormClass.grid(tableGrid), children: [_jsxs("div", { className: accountFormClass.contents, children: [_jsx("div", { className: accountFormClass.headCellName(msTableTw.theadRow, th), children: "Field Name" }), _jsxs("div", { className: accountFormClass.headCellValue(msTableTw.theadRow, th), children: [_jsx("span", { children: "Value" }), roleTable] })] }), _jsxs("div", { className: accountFormClass.contents, children: [_jsx("div", { className: accountFormClass.labelCell(zebraA, cell), children: "Address" }), _jsxs("div", { className: accountFormClass.valueCell(zebraA, cell), children: [_jsxs("div", { className: accountFormClass.inputLine, children: [_jsx("input", { id: fieldId('publicKey'), type: "text", name: "publicKey", value: connected ? publicKey : disconnectedMetaMaskMessage, readOnly: !connected || inputLocked || publicKeyLocked, placeholder: !connected
                                                        ? disconnectedMetaMaskMessage
                                                        : hoveredInput === 'publicKey'
                                                            ? FIELD_PLACEHOLDERS.publicKey
                                                            : 'Required', title: !connected
                                                        ? disconnectedMetaMaskMessage
                                                        : errors.publicKey
                                                            ? `Required for Code Account Operations | Error: ${errors.publicKey}`
                                                            : 'Required for Code Account Operations', className: accountFormClass.input({ base: requiredInputClasses, disconnected: !connected, valueError: errorValueClasses, error: !!errors.publicKey, loading: getLoadingClassesForField('publicKey') }), onChange: onPublicKeyChange, onBlur: onPublicKeyBlur, onMouseEnter: () => setHoveredInput('publicKey'), onMouseLeave: () => setHoveredInput(null) }), connected && publicKey ? (_jsx("button", { type: "button", onClick: handleCopyAddress, title: "Copy address", className: accountFormClass.copyButton, children: copiedField === 'address' ? _jsx(Check, { className: accountFormClass.copiedIcon }) : _jsx(CopyIcon, {}) })) : null] }), errors.publicKey ? (_jsx("p", { className: accountFormClass.errorText, children: errors.publicKey })) : null] })] }), privateKeyRow ? privateKeyRow({ zebra: zebraB, cell }) : null, formFieldRows.map(({ label, name, labelTitle }, index) => (_jsxs("div", { className: accountFormClass.contents, children: [_jsx("div", { className: accountFormClass.labelCell((index + 2 + (privateKeyRow ? 1 : 0)) % 2 === 0 ? zebraB : zebraA, cell), title: labelTitle, children: label }), _jsx("div", { className: accountFormClass.valueCell((index + 2 + (privateKeyRow ? 1 : 0)) % 2 === 0 ? zebraB : zebraA, cell), children: (() => {
                                        const key = name;
                                        const href = toPreviewHref(key, String(formData[key] ?? ''));
                                        const isLinkField = key === 'email' || key === 'website';
                                        const absoluteFieldError = getAbsoluteFieldError(key, String(formData[key] ?? ''));
                                        const fieldError = absoluteFieldError ?? errors[key];
                                        const composedTitle = fieldError
                                            ? `${labelTitle} | Error: ${fieldError}`
                                            : labelTitle;
                                        const fieldValue = String(formData[key] ?? '');
                                        const showCopy = isLinkField && !!fieldValue;
                                        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: accountFormClass.inputLine, children: [_jsx("input", { id: fieldId(name), name: name, type: "text", value: connected ? formData[key] : '', onChange: onChange, readOnly: inputLocked, placeholder: hoveredInput === name ? inputLocked ? lockedInputMessage : FIELD_PLACEHOLDERS[key] : 'Optional', title: composedTitle, className: accountFormClass.input({ base: optionalInputClasses, valueError: errorValueClasses, link: !!(isLinkField && href && hoveringLinkTextField === key), error: !!fieldError, loading: getLoadingClassesForField(name) }), onClick: (e) => {
                                                                if (!href || inputLocked)
                                                                    return;
                                                                const clickedOnText = shouldOpenLinkFromInputClick(e.currentTarget, String(formData[key] ?? ''), e);
                                                                if (!clickedOnText) {
                                                                    const inputEl = e.currentTarget;
                                                                    inputEl.focus();
                                                                    inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
                                                                    return;
                                                                }
                                                                if (href.startsWith('mailto:')) {
                                                                    platform.openUrl(href, { sameTab: true });
                                                                    return;
                                                                }
                                                                platform.openUrl(href);
                                                            }, onMouseEnter: () => setHoveredInput(name), onMouseMove: (e) => {
                                                                setHoveredInput(name);
                                                                if (!href) {
                                                                    if (hoveringLinkTextField === key) {
                                                                        setHoveringLinkTextField(null);
                                                                    }
                                                                    return;
                                                                }
                                                                const overText = shouldOpenLinkFromInputClick(e.currentTarget, String(formData[key] ?? ''), e);
                                                                setHoveringLinkTextField(overText ? key : null);
                                                            }, onMouseLeave: () => {
                                                                setHoveredInput(null);
                                                                if (hoveringLinkTextField === key) {
                                                                    setHoveringLinkTextField(null);
                                                                }
                                                            }, onBlur: () => onFieldBlur(key) }), showCopy ? (_jsx("button", { type: "button", title: `Copy ${label}`, onClick: () => handleCopyField(name, fieldValue), className: accountFormClass.copyButton, children: copiedField === name ? _jsx(Check, { className: accountFormClass.copiedIcon }) : _jsx(CopyIcon, {}) })) : null] }), fieldError ? (_jsx("p", { className: accountFormClass.errorText, children: fieldError })) : null] }));
                                    })() })] }, name))), _jsxs("div", { className: accountFormClass.descriptionCell(zebraB, cell), children: [_jsx("div", { className: accountFormClass.descriptionLabel, children: "Description:" }), _jsxs("div", { className: accountFormClass.descriptionBox, children: [_jsx("textarea", { id: fieldId('description'), name: "description", ref: descriptionTextareaRef, value: connected ? formData.description : '', onChange: onChange, readOnly: inputLocked, rows: 1, placeholder: hoveredInput === 'description' ? inputLocked ? lockedInputMessage : FIELD_PLACEHOLDERS.description : 'Optional', title: formData.description && errors.description ? `Account Description | Error: ${errors.description}` : 'Account Description', className: accountFormClass.input({ base: optionalInputClasses, valueError: errorValueClasses, tail: accountFormClass.descriptionInputTail, error: !!errors.description, loading: getLoadingClassesForField('description') }), onMouseEnter: () => setHoveredInput('description'), onMouseLeave: () => setHoveredInput(null), onBlur: () => onFieldBlur('description') }), errors.description ? (_jsx("p", { className: accountFormClass.errorText, children: errors.description })) : null] })] }), _jsx("div", { className: accountFormClass.contents, children: _jsx("div", { className: accountFormClass.buttonRowOuter, children: !connected ? (connectButton ?? null) : (_jsxs("div", { className: accountFormClass.buttonRow, children: [_jsx("button", { type: !isEditMode ? 'button' : 'submit', "aria-disabled": disableSubmit, className: accountFormClass.saveButton({ noChangesToUpdate, isEditMode, hoverCreate: hoverTarget === 'createAccount', disableSubmit, hasUnsavedChanges, canCreateMissingAccount }), title: submitLabel === 'Create Account'
                                                ? undefined
                                                : !hasUnsavedChanges
                                                    ? submitLabel === 'Edit Account'
                                                        ? 'No changes to Edit'
                                                        : 'No changes to Update'
                                                    : submitLabel, disabled: disableSubmit, onMouseEnter: () => {
                                                if (noChangesToUpdate)
                                                    return;
                                                setHoverTarget('createAccount');
                                            }, onMouseLeave: () => {
                                                if (noChangesToUpdate)
                                                    return;
                                                setHoverTarget(null);
                                            }, children: isSaving ? 'Saving...' : submitLabel }), _jsx("button", { type: "button", "aria-disabled": disableRevert, className: accountFormClass.revertButton({ isRevertNoop, isEditMode, hoverRevert: hoverTarget === 'revertChanges', disableRevert, hasUnsavedChanges }), title: disableRevert || !hasUnsavedChanges
                                                ? 'No changes to revert'
                                                : 'Revert all pending changes', disabled: disableRevert, onClick: () => {
                                                if (isRevertNoop)
                                                    return;
                                                onRevert();
                                            }, onMouseEnter: () => {
                                                if (isRevertNoop)
                                                    return;
                                                setHoverTarget('revertChanges');
                                            }, onMouseLeave: () => {
                                                if (isRevertNoop)
                                                    return;
                                                setHoverTarget(null);
                                            }, children: "Revert Changes" })] })) }) })] }) }), footer] }));
}
