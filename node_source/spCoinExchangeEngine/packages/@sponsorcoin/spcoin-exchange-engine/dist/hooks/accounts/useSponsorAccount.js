// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/accounts/useSponsorAccount.ts
// 2026-09-18 — moved from the parent app's ...nested/accounts/useSponsorAccount.ts.
import { useAccounts } from './useAccounts';
export function useSponsorAccount() {
    const [accounts, setAccounts] = useAccounts();
    const sponsor = accounts.sponsorAccount;
    const setSponsor = (next) => {
        setAccounts((prev) => ({
            ...prev,
            sponsorAccount: next,
        }));
    };
    return [sponsor, setSponsor];
}
