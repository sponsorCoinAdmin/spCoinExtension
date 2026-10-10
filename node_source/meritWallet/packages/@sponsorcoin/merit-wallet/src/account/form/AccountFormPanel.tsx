// File: src/account/form/AccountFormPanel.tsx
//
// 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 18) -- the account editor's form table (address, name, symbol, email, website, description, Save / Revert), moved from the web app's CreateAccountFormPanel so the web app and
// the extension show one editor. What only the web app has comes in through slots: the role chips, the Private Key row (one-time key or click-to-reveal with a password step-up), the Connect button and the modal that row opens.
'use client';

import React, { useState, useCallback } from 'react';
import { Check } from 'lucide-react';
import { msTableTw } from '@sponsorcoin/spcoin-panels';
import type {
  AccountFormData,
  AccountFormErrors,
  AccountFormField,
} from './formTypes';
import { FIELD_PLACEHOLDERS, FIELD_TITLES ,
  getAbsoluteFieldError,
  shouldOpenLinkFromInputClick,
  toPreviewHref,
} from './formHelpers';


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
  privateKeyRow?: (style: { zebra: string; cell: string }) => React.ReactNode;
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

export default function CreateAccountFormPanel({
  panelMarginClass,
  accountPanelBorderClass,
  contentWidthClass = 'max-w-[56rem]',
  idPrefix = '',
  formHeading = 'Account Meta Data',
  topRowContent,
  connected,
  publicKey,
  publicKeyLocked = false,
  roleTable,
  privateKeyRow,
  connectButton,
  footer,
  formData,
  errors,
  descriptionTextareaRef,
  inputLocked,
  isLoading,
  loadingInputMessage,
  isSaving,
  isEditMode,
  submitLabel,
  hasUnsavedChanges,
  canCreateMissingAccount,
  disableSubmit,
  disableRevert,
  isRevertNoop,
  errorValueDisplay = false,
  onPublicKeyChange,
  onPublicKeyBlur,
  onChange,
  onFieldBlur,
  onRevert,
}: Props) {
  const [hoveredInput, setHoveredInput] = useState<string | null>(null);
  const [hoveringLinkTextField, setHoveringLinkTextField] = useState<
    AccountFormField | null
  >(null);
  const [hoverTarget, setHoverTarget] = useState<'createAccount' | 'revertChanges' | null>(
    null,
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const handleCopyAddress = useCallback(() => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey).then(() => {
      setCopiedField('address');
      setTimeout(() => setCopiedField(null), 1500);
    });
  }, [publicKey]);
  const handleCopyField = useCallback((fieldName: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 1500);
    });
  }, []);

  const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );

  const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-300/80';
  const cell = 'px-3 py-3 text-sm align-middle';
  const baseInputClasses =
    'w-full rounded bg-transparent text-white focus:outline-none focus:ring-0';
  const requiredInputClasses = `${baseInputClasses} placeholder:text-red-500`;
  const optionalInputClasses = `${baseInputClasses} placeholder:text-green-400`;
  const zebraA = 'bg-[rgba(56,78,126,0.35)]';
  const zebraB = 'bg-[rgba(156,163,175,0.25)]';
  const tableGrid = 'grid grid-cols-[max-content_minmax(0,1fr)]';
  const disconnectedInputMessage =
    'Connection Required and input is prohibited until connection is established.';
  const disconnectedMetaMaskMessage = 'MetaMask Connection Required';
  const inputErrorClasses = 'border-red-500';
  const errorValueClasses = errorValueDisplay ? ' border-red-500 font-semibold text-red-500' : '';
  const loadingFieldClasses = 'bg-red-900/60 border-red-500 cursor-not-allowed';
  const lockedInputMessage = isLoading ? loadingInputMessage : disconnectedInputMessage;
  const noChangesToUpdate = submitLabel !== 'Create Account' && !hasUnsavedChanges;
  const getLoadingClassesForField = (fieldName: string): string =>
    isLoading && hoveredInput === fieldName ? loadingFieldClasses : '';
  const fieldId = (fieldName: string) => `${idPrefix}${fieldName}`;

  const formFieldRows: {
    label: string;
    name: AccountFormField;
    labelTitle: string;
  }[] = [
    { label: 'Name', name: 'name', labelTitle: FIELD_TITLES.name },
    { label: 'Symbol', name: 'symbol', labelTitle: FIELD_TITLES.symbol },
    { label: 'Email Address', name: 'email', labelTitle: FIELD_TITLES.email },
    { label: 'Website', name: 'website', labelTitle: FIELD_TITLES.website },
  ];

  return (
    <section
      className={`${panelMarginClass} ${accountPanelBorderClass} order-2 flex h-full w-full flex-col items-start justify-start px-0 pt-4 pb-4`}
    >
      {formHeading || topRowContent ? (
        <div className={`mb-4 w-full ${contentWidthClass}`}>
          {formHeading ? (
            <div className="grid w-full grid-cols-1 md:grid-cols-[minmax(10rem,max-content)_minmax(0,1fr)]">
              <div className="invisible hidden h-0 overflow-hidden px-2 whitespace-nowrap md:block">
                Address
              </div>
              <h2 className="w-full text-center text-lg font-semibold text-[#5981F3]">
                {formHeading}
              </h2>
            </div>
          ) : null}
          {topRowContent ? <div className={formHeading ? 'mt-3 w-full' : 'w-full'}>{topRowContent}</div> : null}
        </div>
      ) : null}
      <div className="scrollbar-hide mb-4 mt-0 w-full min-w-0 overflow-x-hidden overflow-y-auto rounded-xl border border-black">
        <div className={`w-full min-w-0 ${tableGrid}`}>
          <div className="contents">
            <div className={`${msTableTw.theadRow} ${th} whitespace-nowrap border-b border-black flex items-center`}>Field Name</div>
            <div className={`${msTableTw.theadRow} ${th} border-b border-black flex items-center justify-between`}>
              <span>Value</span>
              {roleTable}
            </div>
          </div>

          <div className="contents">
            <div className={`${zebraA} ${cell} whitespace-nowrap border-b border-black`}>Address</div>
            <div className={`${zebraA} ${cell} min-w-0 border-b border-black`}>
              <div className="flex items-center justify-between w-full min-w-0 gap-1">
                <input
                  id={fieldId('publicKey')}
                  type="text"
                  name="publicKey"
                  value={connected ? publicKey : disconnectedMetaMaskMessage}
                  readOnly={!connected || inputLocked || publicKeyLocked}
                  placeholder={
                    !connected
                      ? disconnectedMetaMaskMessage
                      : hoveredInput === 'publicKey'
                      ? FIELD_PLACEHOLDERS.publicKey
                      : 'Required'
                  }
                  title={
                    !connected
                      ? disconnectedMetaMaskMessage
                      : errors.publicKey
                      ? `Required for Code Account Operations | Error: ${errors.publicKey}`
                      : 'Required for Code Account Operations'
                  }
                  className={`${requiredInputClasses}${!connected ? ' text-center font-bold text-red-500' : ''}${errorValueClasses}${errors.publicKey ? ` ${inputErrorClasses}` : ''}${getLoadingClassesForField('publicKey') ? ` ${getLoadingClassesForField('publicKey')}` : ''}`}
                  onChange={onPublicKeyChange}
                  onBlur={onPublicKeyBlur}
                  onMouseEnter={() => setHoveredInput('publicKey')}
                  onMouseLeave={() => setHoveredInput(null)}
                />
                {connected && publicKey ? (
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    title="Copy address"
                    className="shrink-0 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedField === 'address' ? <Check className="h-[22px] w-[22px] text-green-400" /> : <CopyIcon />}
                  </button>
                ) : null}
              </div>
              {errors.publicKey ? (
                <p className="text-sm text-red-500">{errors.publicKey}</p>
              ) : null}
            </div>
          </div>

          {privateKeyRow ? privateKeyRow({ zebra: zebraB, cell }) : null}

          {formFieldRows.map(({ label, name, labelTitle }, index) => (
            <div className="contents" key={name}>
              <div
                className={`${(index + 2 + (privateKeyRow ? 1 : 0)) % 2 === 0 ? zebraB : zebraA} ${cell} whitespace-nowrap border-b border-black`}
                title={labelTitle}
              >
                {label}
              </div>
              <div className={`${(index + 2 + (privateKeyRow ? 1 : 0)) % 2 === 0 ? zebraB : zebraA} ${cell} min-w-0 border-b border-black`}>
                {(() => {
                  const key = name;
                  const href = toPreviewHref(key, String(formData[key] ?? ''));
                  const isLinkField = key === 'email' || key === 'website';
                  const absoluteFieldError = getAbsoluteFieldError(
                    key,
                    String(formData[key] ?? ''),
                  );
                  const fieldError = absoluteFieldError ?? errors[key];
                  const composedTitle = fieldError
                    ? `${labelTitle} | Error: ${fieldError}`
                    : labelTitle;

                  const fieldValue = String(formData[key] ?? '');
                  const showCopy = isLinkField && !!fieldValue;

                  return (
                    <>
                      <div className="flex items-center justify-between w-full min-w-0 gap-1">
                        <input
                          id={fieldId(name)}
                          name={name}
                          type="text"
                          value={connected ? formData[key] : ''}
                          onChange={onChange}
                          readOnly={inputLocked}
                          placeholder={hoveredInput === name ? inputLocked ? lockedInputMessage : FIELD_PLACEHOLDERS[key] : 'Optional'}
                          title={composedTitle}
                          className={`${optionalInputClasses}${errorValueClasses}${isLinkField && href && hoveringLinkTextField === key ? ' underline text-blue-300 cursor-pointer' : ''}${fieldError ? ` ${inputErrorClasses}` : ''}${getLoadingClassesForField(name) ? ` ${getLoadingClassesForField(name)}` : ''}`}
                          onClick={(e) => {
                            if (!href || inputLocked) return;
                            const clickedOnText = shouldOpenLinkFromInputClick(
                              e.currentTarget,
                              String(formData[key] ?? ''),
                              e,
                            );
                            if (!clickedOnText) {
                              const inputEl = e.currentTarget;
                              inputEl.focus();
                              inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
                              return;
                            }
                            if (href.startsWith('mailto:')) {
                              window.location.href = href;
                              return;
                            }
                            window.open(href, '_blank', 'noopener,noreferrer');
                          }}
                          onMouseEnter={() => setHoveredInput(name)}
                          onMouseMove={(e) => {
                            setHoveredInput(name);
                            if (!href) {
                              if (hoveringLinkTextField === key) {
                                setHoveringLinkTextField(null);
                              }
                              return;
                            }
                            const overText = shouldOpenLinkFromInputClick(
                              e.currentTarget,
                              String(formData[key] ?? ''),
                              e,
                            );
                            setHoveringLinkTextField(overText ? key : null);
                          }}
                          onMouseLeave={() => {
                            setHoveredInput(null);
                            if (hoveringLinkTextField === key) {
                              setHoveringLinkTextField(null);
                            }
                          }}
                          onBlur={() => onFieldBlur(key)}
                        />
                        {showCopy ? (
                          <button
                            type="button"
                            title={`Copy ${label}`}
                            onClick={() => handleCopyField(name, fieldValue)}
                            className="shrink-0 text-slate-400 hover:text-white transition-colors"
                          >
                            {copiedField === name ? <Check className="h-[22px] w-[22px] text-green-400" /> : <CopyIcon />}
                          </button>
                        ) : null}
                      </div>
                      {fieldError ? (
                        <p className="text-sm text-red-500">{fieldError}</p>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </div>
          ))}

          <div className={`${zebraB} ${cell} col-span-2 min-w-0`}>
            <div className="whitespace-nowrap text-center">Description:</div>
            <div className="box-border w-full min-w-0 whitespace-normal break-all pr-[5px]">
              <textarea
                id={fieldId('description')}
                name="description"
                ref={descriptionTextareaRef}
                value={connected ? formData.description : ''}
                onChange={onChange}
                readOnly={inputLocked}
                rows={1}
                placeholder={hoveredInput === 'description' ? inputLocked ? lockedInputMessage : FIELD_PLACEHOLDERS.description : 'Optional'}
                title={formData.description && errors.description ? `Account Description | Error: ${errors.description}` : 'Account Description'}
                className={`${optionalInputClasses}${errorValueClasses} min-h-[42px] resize-none overflow-hidden whitespace-pre-wrap break-words ${errors.description ? ` ${inputErrorClasses}` : ''}${getLoadingClassesForField('description') ? ` ${getLoadingClassesForField('description')}` : ''}`}
                onMouseEnter={() => setHoveredInput('description')}
                onMouseLeave={() => setHoveredInput(null)}
                onBlur={() => onFieldBlur('description')}
              />
              {errors.description ? (
                <p className="text-sm text-red-500">{errors.description}</p>
              ) : null}
            </div>
          </div>

          <div className="contents">
            <div className="col-span-2 border-t border-black/30">
              {!connected ? (
                connectButton ?? null
              ) : (
                <div className="flex">
                  <button
                    type={!isEditMode ? 'button' : 'submit'}
                    aria-disabled={disableSubmit}
                    className={`flex-1 rounded-l-md rounded-r-none rounded-tl-none rounded-tr-none border-r border-black/50 py-2 text-center font-bold text-black transition-colors ${
                      noChangesToUpdate
                        ? 'bg-[#E5B94F] text-black hover:bg-[#E5B94F] transition-none cursor-default'
                        : !isEditMode
                        ? hoverTarget === 'createAccount'
                          ? 'bg-red-500 text-black'
                          : 'bg-[#E5B94F] text-black'
                        : disableSubmit
                        ? 'bg-red-500 text-black cursor-not-allowed'
                        : hoverTarget === 'createAccount'
                        ? hasUnsavedChanges || canCreateMissingAccount
                          ? 'bg-green-500 text-black'
                          : 'bg-red-500 text-black'
                        : 'bg-[#E5B94F] text-black'
                    }`}
                    title={
                      submitLabel === 'Create Account'
                        ? undefined
                        : !hasUnsavedChanges
                        ? submitLabel === 'Edit Account'
                          ? 'No changes to Edit'
                          : 'No changes to Update'
                        : submitLabel
                    }
                    disabled={disableSubmit}
                    onMouseEnter={() => {
                      if (noChangesToUpdate) return;
                      setHoverTarget('createAccount');
                    }}
                    onMouseLeave={() => {
                      if (noChangesToUpdate) return;
                      setHoverTarget(null);
                    }}
                  >
                    {isSaving ? 'Saving...' : submitLabel}
                  </button>
                  <button
                    type="button"
                    aria-disabled={disableRevert}
                    className={`flex-1 rounded-bl-none rounded-br-md rounded-tl-none rounded-tr-none py-2 text-center font-bold text-black transition-colors ${
                      isRevertNoop
                        ? 'bg-[#E5B94F] text-black hover:bg-[#E5B94F] transition-none cursor-default'
                        : !isEditMode
                        ? hoverTarget === 'revertChanges'
                          ? 'bg-red-500 text-black'
                          : 'bg-[#E5B94F] text-black'
                        : disableRevert
                        ? 'bg-red-500 text-black cursor-not-allowed'
                        : hoverTarget === 'revertChanges'
                        ? hasUnsavedChanges
                          ? 'bg-green-500 text-black'
                          : 'bg-red-500 text-black'
                        : 'bg-[#E5B94F] text-black'
                    }`}
                    title={
                      disableRevert || !hasUnsavedChanges
                        ? 'No changes to revert'
                        : 'Revert all pending changes'
                    }
                    disabled={disableRevert}
                    onClick={() => {
                      if (isRevertNoop) return;
                      onRevert();
                    }}
                    onMouseEnter={() => {
                      if (isRevertNoop) return;
                      setHoverTarget('revertChanges');
                    }}
                    onMouseLeave={() => {
                      if (isRevertNoop) return;
                      setHoverTarget(null);
                    }}
                  >
                    Revert Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {footer}
    </section>
  );
}