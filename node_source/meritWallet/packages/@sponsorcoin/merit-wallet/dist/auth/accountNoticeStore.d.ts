export interface AccountNotice {
    /** A new number for every notice: the panel shows each one once. */
    id: number;
    message: string;
    /** The accounts the notice is about, shown as rows with their icons. */
    addresses: string[];
}
type Listener = () => void;
export declare const accountNoticeStore: {
    publish(message: string, addresses?: string[]): void;
    get: () => AccountNotice | null;
    subscribe(listener: Listener): () => void;
    /** For tests. */
    reset(): void;
};
/** What a row of the notice's popup shows, from the address and whatever the host knows of the account. */
export interface NoticeAccountProfile {
    name?: string;
    symbol?: string;
    iconSrc?: string;
}
export {};
