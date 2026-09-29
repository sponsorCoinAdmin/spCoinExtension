// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/accounts/useRecipientAccounts.ts
// 2026-09-18 — moved from the parent app's ...nested/accounts/useRecipientAccounts.ts.
// Real bug fixed in the move: setRecipients's updater wrote to a
// non-existent `recipients` field instead of `recipientAccounts` (a
// copy-paste mistake shared with useSponsorAccounts.ts/useAgentAccounts.ts
// — same fix applied to both) — every call silently failed to persist,
// since nothing reads `recipients`. Found by direct inspection while
// moving this file, not previously reported.
import { useAccounts } from './useAccounts';
export function useRecipientAccounts() {
    const [accounts, setAccounts] = useAccounts();
    const recipients = accounts.recipientAccounts ?? [];
    const setRecipients = (next) => {
        setAccounts((prev) => {
            const current = prev.recipientAccounts ?? [];
            const updated = typeof next === 'function'
                ? next(current)
                : next;
            return {
                ...prev,
                recipientAccounts: updated,
            };
        });
    };
    return [recipients, setRecipients];
}
