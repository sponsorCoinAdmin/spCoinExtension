import type { AccountRemoval } from './accountSource';
interface RemoveAccountAccount {
    address: string;
    name?: string;
    symbol?: string;
    logoURL?: string;
}
export default function RemoveAccountPanel({ removal, account, onRemoved, balanceText }: {
    removal: AccountRemoval;
    account: RemoveAccountAccount;
    onRemoved?: (message: string) => void; /** The account's balance when it is not zero (rule X5): shown with the loss warning of a local account. */
    balanceText?: string;
}): import("react").JSX.Element;
export {};
