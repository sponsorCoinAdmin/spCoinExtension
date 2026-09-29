// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/accounts/useAgentAccount.ts
// 2026-09-18 — moved from the parent app's ...nested/accounts/useAgentAccount.ts.

import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { useAccounts } from './useAccounts';

export function useAgentAccount(): [
  spCoinAccount | undefined,
  (next: spCoinAccount | undefined) => void,
] {
  const [accounts, setAccounts] = useAccounts();
  const agent = accounts.agentAccount;

  const setAgent = (next: spCoinAccount | undefined) => {
    setAccounts((prev) => ({
      ...prev,
      agentAccount: next,
    }));
  };

  return [agent, setAgent];
}
