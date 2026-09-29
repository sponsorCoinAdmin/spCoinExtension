import { useExchangeContext } from '../useExchangeContext';
type Accounts = ReturnType<typeof useExchangeContext>['exchangeContext']['apiCoreSyncedMembers']['accounts'];
type AccountsUpdater = Accounts | ((prev: Accounts) => Accounts);
export declare function useAccounts(): [Accounts, (next: AccountsUpdater) => void];
export {};
