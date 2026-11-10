import type { AccountRemoval } from './accountSource';
export interface RemoveAccountAccount {
    address: string;
    name?: string;
    symbol?: string;
    logoURL?: string;
}
export default function RemoveAccountPanel({ removal, account, onRemoved }: {
    removal: AccountRemoval;
    account: RemoveAccountAccount;
    onRemoved?: () => void;
}): import("react").JSX.Element;
