// File: src/account/form/useAccountLiveRefresh.ts
//
// 2026-11-04 (owner decision: the host's caches are the single source of truth, and every screen that shows an account follows them live): the details form reads an account's avatar from the host's image cache and its record from the shared record cache, and reads
// them again whenever either announces a change (through the platform), so a save, a sync or an edit elsewhere shows at once with no remount. Returns the function the form uses to show an account's avatar.
import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { engineTrace, loadAccountRecord, type AccountRegistryRecord } from '@sponsorcoin/spcoin-exchange-engine';
import { usePlatform } from '../../platform/platform';
import type { AccountFormData } from './formTypes';

export interface AccountLiveRefreshParams {
  /** The account the form shows ('' or undefined: none). */
  address: string | undefined;
  /** The host's avatar for an account (its image cache); without it the record's own logo address is used. */
  resolveAvatar?: (address: string) => Promise<string | undefined>;
  baselineData: AccountFormData;
  formDataFromRecord: (record: AccountRegistryRecord) => AccountFormData;
  setFormData: Dispatch<SetStateAction<AccountFormData>>;
  setBaselineData: Dispatch<SetStateAction<AccountFormData>>;
  setServerLogoURL: Dispatch<SetStateAction<string>>;
}

export function useAccountLiveRefresh({ address, resolveAvatar, baselineData, formDataFromRecord, setFormData, setBaselineData, setServerLogoURL }: AccountLiveRefreshParams) {
  const platform = usePlatform();
  const resolveAvatarRef = useRef(resolveAvatar);
  resolveAvatarRef.current = resolveAvatar;
  const baselineRef = useRef(baselineData);
  baselineRef.current = baselineData;

  // the avatar again when the image cache changes
  useEffect(() => {
    if (!address || !resolveAvatarRef.current) return undefined;
    return platform.onImageCacheUpdated?.(() => void resolveAvatarRef.current?.(address).then((src) => { if (src) setServerLogoURL(src); }));
  }, [address, platform, setServerLogoURL]);

  // the record again when the record cache changes; what the person has typed is never replaced: only a form with no edits takes the new record
  useEffect(() => {
    if (!address) return undefined;
    return platform.onAccountRecordUpdated?.((changed) => {
      if (changed.toLowerCase() !== address.toLowerCase()) return;
      engineTrace('accountForm: record updated, read again', { address: changed });
      void loadAccountRecord(address)
        .then((record) => {
          const fresh = formDataFromRecord(record as AccountRegistryRecord);
          setFormData((current) => (JSON.stringify(current) === JSON.stringify(baselineRef.current) ? fresh : current));
          setBaselineData(fresh);
        })
        .catch(() => undefined);
    });
  }, [address, platform, formDataFromRecord, setFormData, setBaselineData]);

  /** The avatar to show for an account: the host's cache, else the record's own address. */
  return (url: string, forAddress: string | undefined) => {
    const resolve = resolveAvatarRef.current;
    if (resolve && forAddress) void resolve(forAddress).then((src) => setServerLogoURL(src ?? url));
    else setServerLogoURL(url);
  };
}
