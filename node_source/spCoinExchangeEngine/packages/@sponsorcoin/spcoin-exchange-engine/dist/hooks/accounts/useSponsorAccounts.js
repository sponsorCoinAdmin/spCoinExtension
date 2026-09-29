// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/accounts/useSponsorAccounts.ts
// 2026-09-18 — moved from the parent app's ...nested/accounts/useSponsorAccounts.ts.
// Same real field-name bug fixed here as useRecipientAccounts.ts — see that
// file's own header comment.
import { useAccounts } from './useAccounts';
export function useSponsorAccounts() {
    const [accounts, setAccounts] = useAccounts();
    const sponsors = accounts.sponsorAccounts ?? [];
    const setSponsors = (next) => {
        setAccounts((prev) => {
            const current = prev.sponsorAccounts ?? [];
            const updated = typeof next === 'function'
                ? next(current)
                : next;
            return {
                ...prev,
                sponsorAccounts: updated,
            };
        });
    };
    return [sponsors, setSponsors];
}
