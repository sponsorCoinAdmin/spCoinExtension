// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/accounts/useAgentsAccounts.ts
// 2026-09-18 — moved from the parent app's ...nested/accounts/useAgentsAccounts.ts
// (filename kept as-is despite exporting useAgentAccounts, plural-of-plural
// typo and all — matching the original exactly rather than fixing naming
// unrelated to the one real bug this move does fix, see below).
// Same real field-name bug fixed here as useRecipientAccounts.ts — see that
// file's own header comment.

import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { useAccounts } from './useAccounts';

export function useAgentAccounts(): [
  spCoinAccount[],
  (next: spCoinAccount[] | ((prev: spCoinAccount[]) => spCoinAccount[])) => void,
] {
  const [accounts, setAccounts] = useAccounts();
  const agents = accounts.agentAccounts ?? [];

  const setAgents = (
    next: spCoinAccount[] | ((prev: spCoinAccount[]) => spCoinAccount[]),
  ) => {
    setAccounts((prev) => {
      const current = prev.agentAccounts ?? [];
      const updated =
        typeof next === 'function'
          ? (next as (p: spCoinAccount[]) => spCoinAccount[])(current)
          : next;
      return {
        ...prev,
        agentAccounts: updated,
      };
    });
  };

  return [agents, setAgents];
}
