// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/accounts/useSponsorAccount.ts
// 2026-09-18 — moved from the parent app's ...nested/accounts/useSponsorAccount.ts.

import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { useAccounts } from './useAccounts';

export function useSponsorAccount(): [
  spCoinAccount | undefined,
  (next: spCoinAccount | undefined) => void,
] {
  const [accounts, setAccounts] = useAccounts();
  const sponsor = accounts.sponsorAccount;

  const setSponsor = (next: spCoinAccount | undefined) => {
    setAccounts((prev) => ({
      ...prev,
      sponsorAccount: next,
    }));
  };

  return [sponsor, setSponsor];
}
