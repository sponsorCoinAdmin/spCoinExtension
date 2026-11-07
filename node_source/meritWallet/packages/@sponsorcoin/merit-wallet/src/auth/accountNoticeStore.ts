// File: src/auth/accountNoticeStore.ts
//
// 2026-11-06 (owner: "this was supposed to be a popup in the style used in this app, with the icons"): the other Merit wallet took accounts out of this wallet's list ("Disconnected by Remote", "Account Does not Exist on Merit (Web App) / Removed from Local").
// This store holds the latest such notice with the accounts it is about; useAccountNoticeMessagePanel (src/auth/useAccountNoticeMessagePanel.ts) shows it in MESSAGE_PANEL, the wallet's one message page, with the accounts' icons.
// A store, not a hook result, because several things can hear the same notice (the account list mounts more than once, a notice made at page load is replayed to every screen that comes up): the same notice published again within RECENT_MS is one notice.
export interface AccountNotice {
  /** A new number for every notice: the panel shows each one once. */
  id: number;
  message: string;
  /** The accounts the notice is about, shown as rows with their icons. */
  addresses: string[];
}

type Listener = () => void;

const RECENT_MS = 30_000;
let current: AccountNotice | null = null;
let nextId = 1;
let lastKey = '';
let lastAt = 0;
const listeners = new Set<Listener>();

export const accountNoticeStore = {
  publish(message: string, addresses: string[] = []): void {
    const key = `${message}|${addresses.map((a) => a.toLowerCase()).join(',')}`;
    const now = Date.now();
    if (key === lastKey && now - lastAt < RECENT_MS) return;
    lastKey = key;
    lastAt = now;
    current = { id: nextId++, message, addresses };
    listeners.forEach((listener) => listener());
  },
  get: (): AccountNotice | null => current,
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** For tests. */
  reset(): void {
    current = null;
    nextId = 1;
    lastKey = '';
    lastAt = 0;
    listeners.clear();
  },
};

/** What a row of the notice's popup shows, from the address and whatever the host knows of the account. */
export interface NoticeAccountProfile {
  name?: string;
  symbol?: string;
  iconSrc?: string;
}
