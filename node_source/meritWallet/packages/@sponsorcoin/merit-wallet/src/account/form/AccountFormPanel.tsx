// File: src/account/form/AccountFormPanel.tsx
//
// 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 18) -- the account editor's form table (address, name, symbol, email, website, description, Save / Revert), moved from the web app's CreateAccountFormPanel so the web app and
// the extension show one editor. What only the web app has comes in through slots: the role chips, the Private Key row (one-time key or click-to-reveal with a password step-up), the Connect button and the modal that row opens.
'use client';

import { accountFormClass } from '@sponsorcoin/spcoin-common/styles';
import React, { useState, useCallback } from 'react';
import { usePlatform } from '../../platform/platform';
import { useCopyFeedback } from '../../platform/useCopyFeedback';
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
import CopyIcon from './CopyIcon';


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
  privateKeyRow?: (classes: { zebra: string; cell: string }) => React.ReactNode;
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
  const { copiedKey: copiedField, copy } = useCopyFeedback();
  const platform = usePlatform();
  const handleCopyAddress = useCallback(() => {
    if (!publicKey) return;
    copy(publicKey, 'address');
  }, [publicKey, copy]);
  const handleCopyField = useCallback((fieldName: string, value: string) => {
    if (!value) return;
    copy(value, fieldName);
  }, [copy]);

  const th = accountFormClass.th;
  const cell = accountFormClass.cell;
  const requiredInputClasses = accountFormClass.requiredInput;
  const optionalInputClasses = accountFormClass.optionalInput;
  const zebraA = accountFormClass.zebraA;
  const zebraB = accountFormClass.zebraB;
  const tableGrid = accountFormClass.tableGridRow;
  const disconnectedInputMessage =
    'Connection Required and input is prohibited until connection is established.';
  const disconnectedMetaMaskMessage = 'MetaMask Connection Required';
  const errorValueClasses = errorValueDisplay ? accountFormClass.errorValue : '';
  const loadingFieldClasses = accountFormClass.loadingField;
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
      className={accountFormClass.section(panelMarginClass, accountPanelBorderClass)}
      data-account-form-ready={isLoading ? 'false' : 'true'}
    >
      {formHeading || topRowContent ? (
        <div className={accountFormClass.headingBox(contentWidthClass)}>
          {formHeading ? (
            <div className={accountFormClass.headingGrid}>
              <div className={accountFormClass.headingSpacer}>
                Address
              </div>
              <h2 className={accountFormClass.heading}>
                {formHeading}
              </h2>
            </div>
          ) : null}
          {topRowContent ? <div className={accountFormClass.topRow(!!formHeading)}>{topRowContent}</div> : null}
        </div>
      ) : null}
      <div className={accountFormClass.tableBox}>
        <div className={accountFormClass.grid(tableGrid)}>
          <div className={accountFormClass.contents}>
            <div className={accountFormClass.headCellName(msTableTw.theadRow, th)}>Field Name</div>
            <div className={accountFormClass.headCellValue(msTableTw.theadRow, th)}>
              <span>Value</span>
              {roleTable}
            </div>
          </div>

          <div className={accountFormClass.contents}>
            <div className={accountFormClass.labelCell(zebraA, cell)}>Address</div>
            <div className={accountFormClass.valueCell(zebraA, cell)}>
              <div className={accountFormClass.inputLine}>
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
                  className={accountFormClass.input({ base: requiredInputClasses, disconnected: !connected, valueError: errorValueClasses, error: !!errors.publicKey, loading: getLoadingClassesForField('publicKey') })}
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
                    className={accountFormClass.copyButton}
                  >
                    {copiedField === 'address' ? <Check className={accountFormClass.copiedIcon} /> : <CopyIcon />}
                  </button>
                ) : null}
              </div>
              {errors.publicKey ? (
                <p className={accountFormClass.errorText}>{errors.publicKey}</p>
              ) : null}
            </div>
          </div>

          {privateKeyRow ? privateKeyRow({ zebra: zebraB, cell }) : null}

          {formFieldRows.map(({ label, name, labelTitle }, index) => (
            <div className={accountFormClass.contents} key={name}>
              <div
                className={accountFormClass.labelCell((index + 2 + (privateKeyRow ? 1 : 0)) % 2 === 0 ? zebraB : zebraA, cell)}
                title={labelTitle}
              >
                {label}
              </div>
              <div className={accountFormClass.valueCell((index + 2 + (privateKeyRow ? 1 : 0)) % 2 === 0 ? zebraB : zebraA, cell)}>
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
                      <div className={accountFormClass.inputLine}>
                        <input
                          id={fieldId(name)}
                          name={name}
                          type="text"
                          value={connected ? formData[key] : ''}
                          onChange={onChange}
                          readOnly={inputLocked}
                          placeholder={hoveredInput === name ? inputLocked ? lockedInputMessage : FIELD_PLACEHOLDERS[key] : 'Optional'}
                          title={composedTitle}
                          className={accountFormClass.input({ base: optionalInputClasses, valueError: errorValueClasses, link: !!(isLinkField && href && hoveringLinkTextField === key), error: !!fieldError, loading: getLoadingClassesForField(name) })}
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
                              platform.openUrl(href, { sameTab: true });
                              return;
                            }
                            platform.openUrl(href);
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
                            className={accountFormClass.copyButton}
                          >
                            {copiedField === name ? <Check className={accountFormClass.copiedIcon} /> : <CopyIcon />}
                          </button>
                        ) : null}
                      </div>
                      {fieldError ? (
                        <p className={accountFormClass.errorText}>{fieldError}</p>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </div>
          ))}

          <div className={accountFormClass.descriptionCell(zebraB, cell)}>
            <div className={accountFormClass.descriptionLabel}>Description:</div>
            <div className={accountFormClass.descriptionBox}>
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
                className={accountFormClass.input({ base: optionalInputClasses, valueError: errorValueClasses, tail: accountFormClass.descriptionInputTail, error: !!errors.description, loading: getLoadingClassesForField('description') })}
                onMouseEnter={() => setHoveredInput('description')}
                onMouseLeave={() => setHoveredInput(null)}
                onBlur={() => onFieldBlur('description')}
              />
              {errors.description ? (
                <p className={accountFormClass.errorText}>{errors.description}</p>
              ) : null}
            </div>
          </div>

          <div className={accountFormClass.contents}>
            <div className={accountFormClass.buttonRowOuter}>
              {!connected ? (
                connectButton ?? null
              ) : (
                <div className={accountFormClass.buttonRow}>
                  <button
                    type={!isEditMode ? 'button' : 'submit'}
                    aria-disabled={disableSubmit}
                    className={accountFormClass.saveButton({ noChangesToUpdate, isEditMode, hoverCreate: hoverTarget === 'createAccount', disableSubmit, hasUnsavedChanges, canCreateMissingAccount })}
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
                    className={accountFormClass.revertButton({ isRevertNoop, isEditMode, hoverRevert: hoverTarget === 'revertChanges', disableRevert, hasUnsavedChanges })}
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