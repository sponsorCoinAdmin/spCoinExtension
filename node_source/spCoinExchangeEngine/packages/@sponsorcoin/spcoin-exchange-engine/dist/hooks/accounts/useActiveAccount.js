// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/accounts/useActiveAccount.ts
// 2026-09-18 — moved from the parent app's ...nested/accounts/useActiveAccount.ts.
import { useAccounts } from './useAccounts';
export function useActiveAccount() {
    const [accounts, setAccounts] = useAccounts();
    const active = accounts.activeAccount;
    const setActive = (next) => {
        setAccounts((prev) => ({
            ...prev,
            activeAccount: next,
        }));
    };
    return [active, setActive];
}
