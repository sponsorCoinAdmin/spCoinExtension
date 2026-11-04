import { type Dispatch, type SetStateAction } from 'react';
import { type AccountRegistryRecord } from '@sponsorcoin/spcoin-exchange-engine';
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
export declare function useAccountLiveRefresh({ address, resolveAvatar, baselineData, formDataFromRecord, setFormData, setBaselineData, setServerLogoURL }: AccountLiveRefreshParams): (url: string, forAddress: string | undefined) => void;
