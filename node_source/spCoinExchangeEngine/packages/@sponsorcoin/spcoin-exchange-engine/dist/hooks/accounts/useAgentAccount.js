// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/accounts/useAgentAccount.ts
// 2026-09-18 — moved from the parent app's ...nested/accounts/useAgentAccount.ts.
import { useAccounts } from './useAccounts';
export function useAgentAccount() {
    const [accounts, setAccounts] = useAccounts();
    const agent = accounts.agentAccount;
    const setAgent = (next) => {
        setAccounts((prev) => ({
            ...prev,
            agentAccount: next,
        }));
    };
    return [agent, setAgent];
}
