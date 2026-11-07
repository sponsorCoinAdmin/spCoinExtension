// File: src/remoteSelectionStore.ts
//
// 2026-10-31 (owner design): a site asked the wallet to connect. The wallet's own account list opens for it ("Remote Merit (Web) Account Selector") with a Connect / Connected button on every account; the first account connected answers the site
// (dappApprovals.ts) and every later change is applied at once; closing the list (back arrow) with nothing connected refuses. This is the slot between the approval queue and the side panel: ONE pending selection at a time.
interface RemoteSelection {
  caller: string;
  origin: string;
  selected: string[];
  /** Called after every toggle with the accounts chosen now (live connect: the host applies each change at once). */
  onChange?: (selected: string[]) => void;
}

type Listener = () => void;
let current: RemoteSelection | null = null;
let settle: (() => void) | null = null;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export const remoteSelectionStore = {
  get: (): RemoteSelection | null => current,
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  toggle(address: string): void {
    if (!current) return;
    const has = current.selected.some((a) => a.toLowerCase() === address.toLowerCase());
    current = { ...current, selected: has ? current.selected.filter((a) => a.toLowerCase() !== address.toLowerCase()) : [...current.selected, address] };
    emit();
    current.onChange?.(current.selected);
  },
  /** 2026-11-06 (owner report: the web app connected an account and the open selector still said Connect): the caller changed the connected accounts while the selector is open; the rows follow. Not an answer: `onChange` is not called. */
  sync(accounts: string[]): void {
    if (!current) return;
    const same = accounts.length === current.selected.length && accounts.every((a) => current!.selected.some((b) => b.toLowerCase() === a.toLowerCase()));
    if (same) return;
    current = { ...current, selected: [...accounts] };
    emit();
  },
  cancel(): void {
    finish();
  },
};

function finish() {
  const resolve = settle;
  current = null;
  settle = null;
  emit();
  resolve?.();
}

/** Open the selection for a site. Resolves when the list is closed (the back arrow, or a newer request replacing it). */
export function requestRemoteSelection(selection: RemoteSelection): Promise<void> {
  if (settle) finish(); // a newer request replaces an older one still open
  current = selection;
  emit();
  return new Promise<void>((resolve) => {
    settle = resolve;
  });
}
