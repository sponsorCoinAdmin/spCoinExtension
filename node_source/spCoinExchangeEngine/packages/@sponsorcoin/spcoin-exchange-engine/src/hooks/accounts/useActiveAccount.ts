// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/accounts/useActiveAccount.ts
// 2026-09-18 — moved from the parent app's ...nested/accounts/useActiveAccount.ts.

import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { useAccounts } from './useAccounts';

export function useActiveAccount(): [
  spCoinAccount | undefined,
  (next: spCoinAccount | undefined) => void,
] {
  const [accounts, setAccounts] = useAccounts();
  const active = accounts.activeAccount;

  const setActive = (next: spCoinAccount | undefined) => {
    setAccounts((prev) => ({
      ...prev,
      activeAccount: next,
    }));
  };

  return [active, setActive];
}
