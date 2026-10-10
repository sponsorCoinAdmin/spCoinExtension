// File: src/account/form/useAccountForm.ts
//
// 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 18) -- the account editor's state and actions (load an account, edit the fields, pick an avatar, sign in and save), moved from the web app's useCreateAccountForm so
// the web app and the extension run one editor. What differs per host is the AccountFormHost: how the saving account signs (the web app's Hardhat keystore or MetaMask; the extension's vault), who may edit whom, and the
// base URL of the hosted API for the sign-in. Loading and saving the record use the engine's account store; messages go to the shared message panel.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STATUS } from '@sponsorcoin/spcoin-common/context';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import {
  getAccountLogoURL,
  loadAccountRecord,
  saveAccountLogo,
  saveAccountRecord,
  useCacheRefreshHandler,
  useErrorMessage,
  usePanelTree,
  type AccountRegistryRecord,
} from '@sponsorcoin/spcoin-exchange-engine';
import type { AccountFormData, AccountFormErrors, AccountFormField } from './formTypes';
import {
  DEFAULT_ACCOUNT_LOGO_URL,
  EMPTY_FORM_DATA,
  FORM_ERROR_FOCUS_ORDER,
  FORM_FIELDS,
  ensureAbsoluteAssetURL,
  getAbsoluteFieldError,
  getFieldTooLargeMessage,
  isValidEmail,
  isValidWebsite,
  normalizeAddress,
  shouldBlockAdditionalInput,
  trimForm,
  withCacheBust,
} from './formHelpers';
import { useAccountFormDerivedState } from './useAccountFormDerivedState';

/** The part of saving an account that differs per host. */
export interface AccountFormHost {
  /** Origin of the hosted API for the sign-in calls ('' = same origin, as in the web app). */
  baseUrl?: string;
  /** The account that signs a save for `target` (`active` = the connected account, if any): its address and a personal_sign function. Throw a readable Error when none is available. */
  signIn(target: string, active: string): Promise<{ signerAddress: string; signMessage(message: string): Promise<string> }>;
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

function isAddress(value: string): boolean {
  return /^0[xX][0-9a-fA-F]{40}$/.test(String(value ?? '').trim());
}

export function useAccountForm({ connected, activeAddress, targetAddress, initialLogoURL, sessionWithoutConnection = false, host }: UseAccountFormParams) {
  const [publicKey, setPublicKey] = useState<string>('');
  const [formData, setFormData] = useState<AccountFormData>({ ...EMPTY_FORM_DATA });
  const [errors, setErrors] = useState<AccountFormErrors>({});
  const [errorFocusTick, setErrorFocusTick] = useState(0);
  const [baselineData, setBaselineData] = useState<AccountFormData>({
    ...EMPTY_FORM_DATA,
  });
  const [accountExists, setAccountExists] = useState<boolean>(false);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [resolvedAccountAddress, setResolvedAccountAddress] = useState<string>('');
  const [invalidAddressPopupPreviousAddress, setInvalidAddressPopupPreviousAddress] =
    useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- an empty-string logoURL is not a usable URL and should fall back too, same as unset
  const [serverLogoURL, setServerLogoURL] = useState(initialLogoURL || DEFAULT_ACCOUNT_LOGO_URL);
  const initialLogoURLRef = useRef(initialLogoURL);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [, setStatusMessage] = useErrorMessage();
  const { openPanel } = usePanelTree();
  const showStatusMessage = (msg: string, status: STATUS, source: string) => {
    setStatusMessage({ errCode: 0, msg, source, status });
    openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, source);
  };

  const resizeDescriptionTextarea = (el?: HTMLTextAreaElement | null): void => {
    const target = el ?? descriptionTextareaRef.current;
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  const resetLoadedAccountState = () => {
    setPublicKey('');
    setFormData({ ...EMPTY_FORM_DATA });
    setBaselineData({ ...EMPTY_FORM_DATA });
    setAccountExists(false);
    setResolvedAccountAddress('');
    setErrors({});
    setLogoFile(null);
    setServerLogoURL(DEFAULT_ACCOUNT_LOGO_URL);
  };

  const requestedTargetAddress = useMemo(
    () => (isAddress(String(targetAddress ?? '').trim()) ? normalizeAddress(String(targetAddress)) : ''),
    [targetAddress],
  );
  const normalizedActiveAddress = useMemo(
    () => (isAddress(String(activeAddress ?? '').trim()) ? normalizeAddress(String(activeAddress)) : ''),
    [activeAddress],
  );
  // Which account's data to DISPLAY — always the requested target when one is
  // given, regardless of authSignerSource. authSignerSource only decides who
  // is authorized to SIGN a save (checked separately below, around the
  // "Connected account mismatch" error) — it must never also decide whose
  // data gets shown, or viewing any RECIPIENT_ACCOUNT/SPONSOR_ACCOUNT/
  // AGENT_ACCOUNT panel while MetaMask is the active wallet source would
  // silently swap in whichever address MetaMask itself currently has
  // selected instead of the account actually being viewed (the bug this
  // replaced: AccountPanelContent.tsx always passes authSignerSource:
  // 'metamask' whenever walletSource is MetaMask, with no guarantee that the
  // account being viewed is the connected one — unlike EditAccountPageClient.tsx,
  // whose 'metamask' source is only ever chosen when they already match).
  const initialAccountAddress = requestedTargetAddress || normalizedActiveAddress;
  const isAuthSessionAvailable = connected || sessionWithoutConnection;

  useEffect(() => {
    if (!initialAccountAddress) {
      if (sessionWithoutConnection) return;
    }
    setPublicKey(initialAccountAddress);
  }, [sessionWithoutConnection, initialAccountAddress]);

  // Keep ref current so the address-change effect always reads the latest value
  useEffect(() => { initialLogoURLRef.current = initialLogoURL; });

  // When the target account changes, immediately show the known logo rather than
  // keeping the previous account's logo while hydrateAccount fetches the new one.
  useEffect(() => {
    const known = initialLogoURLRef.current;
    if (known) setServerLogoURL(known);
  }, [initialAccountAddress]);

  useEffect(() => {
    if (sessionWithoutConnection) return;
    if (initialAccountAddress) return;
    resetLoadedAccountState();
  }, [sessionWithoutConnection, initialAccountAddress]);

  useEffect(() => {
    resizeDescriptionTextarea();
  }, [formData.description]);

  // Stable across renders (keyed only on the address itself) so it can be
  // reused both by the mount/address-change effect below and by the Merit
  // Wallet's refresh-icon handler — previously this was inline inside the
  // effect, which meant nothing else could re-trigger it: clicking refresh
  // while this panel was open silently did nothing, since neither
  // initialAccountAddress nor isAuthSessionAvailable change on a refresh
  // click.
  const hydrateAccount = useCallback(
    async (signal?: AbortSignal) => {
      if (!initialAccountAddress) return;
      setIsLoadingAccount(true);
      try {
        const normalizedAddress = initialAccountAddress;
        const record = (await loadAccountRecord(normalizedAddress, {
          forceRefresh: true,
          signal,
        })) as AccountRegistryRecord;
        if (signal?.aborted) return;

        const resolvedLogoURL = ensureAbsoluteAssetURL(
          String((record as any)?.logoURL ?? DEFAULT_ACCOUNT_LOGO_URL),
        );

        const loaded: AccountFormData = {
          name: typeof record.name === 'string' ? record.name : '',
          symbol: typeof record.symbol === 'string' ? record.symbol : '',
          email: typeof record.email === 'string' ? record.email : '',
          website: typeof record.website === 'string' ? record.website : '',
          description:
            typeof record.description === 'string' ? record.description : '',
          recipientNetwork: Array.isArray((record as any)?.recipientNetwork)
            ? Array.from(
                new Set(
                  ((record as any).recipientNetwork as unknown[])
                    .map((value) => Number(value))
                    .filter((value) => Number.isFinite(value)),
                ),
              )
            : [],
        };

        setPublicKey(normalizedAddress);
        setResolvedAccountAddress(normalizedAddress);
        setAccountExists(true);
        setFormData(loaded);
        setBaselineData(loaded);
        setErrors({});
        setLogoFile(null);
        setServerLogoURL(withCacheBust(resolvedLogoURL));
      } catch {
        if (!signal?.aborted) {
          setPublicKey(initialAccountAddress);
          setResolvedAccountAddress(initialAccountAddress);
          setAccountExists(false);
          setFormData({ ...EMPTY_FORM_DATA });
          setBaselineData({ ...EMPTY_FORM_DATA });
          setErrors({});
          setLogoFile(null);
          setServerLogoURL(DEFAULT_ACCOUNT_LOGO_URL);
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoadingAccount(false);
        }
      }
    },
    [initialAccountAddress],
  );

  useEffect(() => {
    if (!isAuthSessionAvailable || !initialAccountAddress) return;
    const abortController = new AbortController();
    void hydrateAccount(abortController.signal);
    return () => abortController.abort();
  }, [hydrateAccount, initialAccountAddress, isAuthSessionAvailable]);

  useCacheRefreshHandler(
    useCallback(() => hydrateAccount(), [hydrateAccount]),
    isAuthSessionAvailable && Boolean(initialAccountAddress),
  );

  const validateField = (field: AccountFormField, rawValue: string): string | null => {
    const raw = String(rawValue ?? '');
    const value = raw.trim();
    if (field === 'name' && raw.length > 50) return 'Name too large';
    if (field === 'symbol' && raw.length > 10) return 'Symbol too large';
    if (field === 'description' && raw.length > 1024) return 'Description too large';
    if (field === 'email' && raw.length > 256) return 'Email too large';
    if (field === 'website' && raw.length > 256) return 'Website too large';
    if (field === 'email' && value && !isValidEmail(value)) return 'Invalid email address';
    if (field === 'website' && value && !isValidWebsite(value)) return 'Invalid website URL';
    return null;
  };

  const validatePreSend = (values: AccountFormData): AccountFormErrors => {
    const next: AccountFormErrors = {};
    if (!publicKey.trim()) next.publicKey = 'Account Address is required';
    for (const field of FORM_FIELDS) {
      const error = validateField(field, values[field]);
      if (error) next[field] = error;
    }
    return next;
  };

  const derived = useAccountFormDerivedState({
    connected: isAuthSessionAvailable,
    publicKey,
    accountExists,
    formData,
    baselineData,
    logoFile,
    isLoadingAccount,
    isSaving,
  });

  const loadAccountByAddress = async (nextAddress: string, previousAddress: string) => {
    const normalizedAddress = normalizeAddress(nextAddress);
    if (normalizedAddress === previousAddress) {
      setPublicKey(normalizedAddress);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.publicKey;
        return next;
      });
      return;
    }

    setIsLoadingAccount(true);
    try {
      const record = (await loadAccountRecord(normalizedAddress, {
        forceRefresh: true,
      })) as AccountRegistryRecord;
      const resolvedLogoURL = ensureAbsoluteAssetURL(
        String((record as any)?.logoURL ?? DEFAULT_ACCOUNT_LOGO_URL),
      );
      const loaded: AccountFormData = {
        name: typeof record.name === 'string' ? record.name : '',
        symbol: typeof record.symbol === 'string' ? record.symbol : '',
        email: typeof record.email === 'string' ? record.email : '',
        website: typeof record.website === 'string' ? record.website : '',
        description:
          typeof record.description === 'string' ? record.description : '',
        recipientNetwork: Array.isArray((record as any)?.recipientNetwork)
          ? Array.from(
              new Set(
                ((record as any).recipientNetwork as unknown[])
                  .map((value) => Number(value))
                  .filter((value) => Number.isFinite(value)),
              ),
            )
          : [],
      };

      setPublicKey(normalizedAddress);
      setResolvedAccountAddress(normalizedAddress);
      setAccountExists(true);
      setFormData(loaded);
      setBaselineData(loaded);
      setErrors({});
      setLogoFile(null);
      setServerLogoURL(withCacheBust(resolvedLogoURL));
    } catch {
      setPublicKey(normalizedAddress);
      setResolvedAccountAddress(normalizedAddress);
      setAccountExists(false);
      setFormData({ ...EMPTY_FORM_DATA });
      setBaselineData({ ...EMPTY_FORM_DATA });
      setLogoFile(null);
      setServerLogoURL(DEFAULT_ACCOUNT_LOGO_URL);
      setErrors((prev) => {
        const next = { ...prev };
        next.publicKey = 'Account not found';
        return next;
      });
    } finally {
      setIsLoadingAccount(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!derived.isActive) return;
    const { name, value } = e.target;
    const field = name as AccountFormField;
    const nextValue = value;
    const currentValue = String(formData[field] ?? '');
    if (shouldBlockAdditionalInput(field, currentValue, nextValue)) {
      const tooLargeError = getFieldTooLargeMessage(field);
      setErrors((prev) => {
        const next = { ...prev };
        if (tooLargeError) next[field] = tooLargeError;
        return next;
      });
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: nextValue }));
    if (field === 'description' && e.target instanceof HTMLTextAreaElement) {
      resizeDescriptionTextarea(e.target);
    }
    const absoluteError = getAbsoluteFieldError(field, nextValue);
    setErrors((prev) => {
      const next = { ...prev };
      if (absoluteError) next[field] = absoluteError;
      else delete next[field];
      return next;
    });
  };

  const handlePublicKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!derived.isActive) return;
    setPublicKey(e.target.value);
    setErrors((prev) => {
      if (!prev.publicKey) return prev;
      const next = { ...prev };
      delete next.publicKey;
      return next;
    });
  };

  const handlePublicKeyBlur = async () => {
    const previousAddress = resolvedAccountAddress || initialAccountAddress;
    const trimmed = String(publicKey ?? '').trim();

    if (!trimmed) {
      setPublicKey(previousAddress);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.publicKey;
        return next;
      });
      return;
    }

    if (!isAddress(trimmed)) {
      setInvalidAddressPopupPreviousAddress(previousAddress);
      setErrors((prev) => {
        const next = { ...prev };
        next.publicKey = 'Invalid account address';
        return next;
      });
      return;
    }

    await loadAccountByAddress(trimmed, previousAddress);
  };

  const handleSelectPublicKey = async (nextAddress: string) => {
    const trimmed = String(nextAddress ?? '').trim();
    const previousAddress = resolvedAccountAddress || initialAccountAddress;
    if (!trimmed || !isAddress(trimmed)) return;
    await loadAccountByAddress(trimmed, previousAddress);
  };

  const handleInvalidAddressContinue = () => {
    setInvalidAddressPopupPreviousAddress(null);
    setErrors((prev) => {
      const next = { ...prev };
      next.publicKey = 'Invalid account address';
      return next;
    });
  };

  const handleInvalidAddressRevert = () => {
    if (invalidAddressPopupPreviousAddress) {
      setPublicKey(invalidAddressPopupPreviousAddress);
    }
    setInvalidAddressPopupPreviousAddress(null);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.publicKey;
      return next;
    });
  };

  const handleFieldBlur = (field: AccountFormField) => {
    const fieldError = validateField(field, formData[field]);
    setErrors((prev) => {
      const next = { ...prev };
      if (fieldError) next[field] = fieldError;
      else delete next[field];
      return next;
    });
  };

  const handleRevertChanges = () => {
    if (!derived.isEditMode || derived.disableRevert || !derived.hasUnsavedChanges) return;
    setFormData(baselineData);
    setLogoFile(null);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!derived.isEditMode) return;
    if (!isAuthSessionAvailable) return;
    const normalizedForm = trimForm(formData);
    const nextErrors = validatePreSend(normalizedForm);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setErrorFocusTick((prev) => prev + 1);
      return;
    }
    if (!derived.publicKeyTrimmed) return;
    if (!derived.hasUnsavedChanges && accountExists) {
      return;
    }

    setIsSaving(true);
    try {
      const normalizedTargetAddress = normalizeAddress(derived.publicKeyTrimmed);
      const { signerAddress, signMessage } = await host.signIn(normalizedTargetAddress, normalizedActiveAddress);

      const nonceRes = await fetch(`${host.baseUrl ?? ''}/api/spCoin/auth/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: signerAddress }),
      });
      if (!nonceRes.ok) {
        let serverError = '';
        try {
          const payload = (await nonceRes.json()) as { error?: string; details?: string };
          serverError = String(payload?.error ?? payload?.details ?? '').trim();
        } catch {
          serverError = '';
        }
        const statusHint =
          nonceRes.status === 429
            ? 'Too many auth attempts. Please wait and try again.'
            : nonceRes.status === 503
            ? 'Server auth is not configured.'
            : '';
        const message = serverError || statusHint || `Nonce request failed (HTTP ${nonceRes.status})`;
        throw new Error(message);
      }
      const noncePayload = (await nonceRes.json()) as {
        nonce?: string;
        message?: string;
      };
      const nonce = String(noncePayload?.nonce ?? '');
      const message = String(noncePayload?.message ?? '');
      if (!nonce || !message) {
        throw new Error('Invalid nonce payload from server');
      }

      const signature = await signMessage(message);
      if (!signature) {
        throw new Error('Signature request rejected');
      }

      const normalizedSignerAddress = normalizeAddress(signerAddress || normalizedTargetAddress);
      const signerCanEditTarget = normalizedSignerAddress === normalizedTargetAddress || Boolean(host.canEdit?.(normalizedSignerAddress, normalizedTargetAddress));
      if (!signerCanEditTarget) {
        const signerLabel = host.signerLabel ?? 'Signer';
        throw new Error(
          `Connected account mismatch. ${signerLabel}=${normalizedSignerAddress}, Target=${derived.publicKeyTrimmed}`,
        );
      }

      const verifyRes = await fetch(`${host.baseUrl ?? ''}/api/spCoin/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: normalizedSignerAddress,
          nonce,
          signature,
        }),
      });
      if (!verifyRes.ok) {
        const failPayload = (await verifyRes.json().catch(() => ({}))) as {
          error?: string;
          details?: string;
        };
        throw new Error(
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- an empty-string error/details field is as good as absent; fall through to the next one
          failPayload?.error || failPayload?.details || 'Signature verification failed',
        );
      }
      const verifyPayload = (await verifyRes.json()) as { token?: string };
      const authToken = String(verifyPayload?.token ?? '');
      if (!authToken) {
        throw new Error('Missing auth token');
      }

      const shouldSaveAccount = derived.hasDataChanges || !accountExists;
      const shouldSaveLogo = Boolean(logoFile);

      if (shouldSaveAccount) {
        const accountPayload = {
          address: derived.publicKeyTrimmed,
          name: normalizedForm.name,
          symbol: normalizedForm.symbol,
          email: normalizedForm.email,
          website: normalizedForm.website,
          description: normalizedForm.description,
          recipientNetwork: normalizedForm.recipientNetwork,
        };
        const saveMethod = accountExists ? 'PUT' : 'POST';
        await saveAccountRecord(
          derived.publicKeyTrimmed,
          accountPayload,
          authToken,
          saveMethod,
        );
      }

      if (shouldSaveLogo && logoFile) {
        const logoForm = new FormData();
        logoForm.append('file', logoFile);
        await saveAccountLogo(derived.publicKeyTrimmed, logoForm, authToken);
      }

      if (shouldSaveAccount) {
        const savedForm: AccountFormData = { ...normalizedForm };
        setAccountExists(true);
        setFormData(savedForm);
        setBaselineData(savedForm);
        setErrors({});
      }

      if (shouldSaveLogo) {
        const canonicalLogoURL = getAccountLogoURL(derived.publicKeyTrimmed);
        setLogoFile(null);
        setServerLogoURL(withCacheBust(canonicalLogoURL));
      }

      if (shouldSaveAccount && shouldSaveLogo) {
        showStatusMessage('Account metadata and image updated successfully', STATUS.SUCCESS, 'useAccountForm:save');
      } else if (shouldSaveAccount) {
        showStatusMessage('Account metadata updated successfully', STATUS.SUCCESS, 'useAccountForm:save');
      } else if (shouldSaveLogo) {
        showStatusMessage('Account image updated successfully', STATUS.SUCCESS, 'useAccountForm:save');
      }
    } catch (err) {
      showStatusMessage(
        err instanceof Error ? err.message : 'Failed to save account',
        STATUS.MESSAGE_ERROR,
        'useAccountForm:save',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      setLogoFile(null);
      return;
    }

    try {
      const processed = await host.processLogo(selected);
      setLogoFile(processed);
    } catch (err) {
      setLogoFile(null);
      showStatusMessage(
        err instanceof Error ? err.message : 'Unable to process image upload',
        STATUS.MESSAGE_ERROR,
        'useAccountForm:handleLogoFileChange',
      );
    }
  };

  useEffect(() => {
    if (!derived.isActive) return;
    const firstErrorField = FORM_ERROR_FOCUS_ORDER.find((field) => Boolean(errors[field]));
    if (!firstErrorField) return;
    const element = document.getElementById(firstErrorField) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (!element || element.readOnly) return;
    element.focus();
  }, [errorFocusTick, errors, derived.isActive]);

  const previewObjectUrl = useMemo(() => {
    if (!logoFile) return '';
    return URL.createObjectURL(logoFile);
  }, [logoFile]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  const logoPreviewSrc = !connected
    ? DEFAULT_ACCOUNT_LOGO_URL
    : previewObjectUrl || serverLogoURL;

  return {
    publicKey,
    formData,
    errors,
    accountExists,
    isLoadingAccount,
    isSaving,
    logoFileInputRef,
    descriptionTextareaRef,
    serverLogoURL,
    setFormData,
    setErrors,
    handleChange,
    handleFieldBlur,
    handlePublicKeyChange,
    handlePublicKeyBlur,
    handleSelectPublicKey,
    handleRevertChanges,
    handleSubmit,
    handleLogoFileChange,
    logoPreviewSrc,
    invalidAddressPopupPreviousAddress,
    handleInvalidAddressContinue,
    handleInvalidAddressRevert,
    ...derived,
  };
}
