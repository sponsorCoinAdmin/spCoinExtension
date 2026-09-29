import { type ReactNode } from 'react';
import type { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export interface DisplayStackStorage {
    /** Read the persisted stack, or null if none/unavailable. */
    read: (key: string) => string | null;
    /** Best-effort write — failures (quota, disabled storage, SSR) should
     *  degrade silently, same contract every prior call site relied on. */
    write: (key: string, value: string) => void;
}
export type SetDisplayStackIds = (updater: (prev: SP_COIN_DISPLAY[]) => SP_COIN_DISPLAY[]) => void;
interface DisplayStackContextValue {
    /** Current stack ids. Same one-render-tolerant contract as any other
     *  React state read — always up to date as of the last commit. */
    displayStackIds: SP_COIN_DISPLAY[];
    setDisplayStackIds: SetDisplayStackIds;
    /** Ref-based "current value right now" accessor — usePanelTree.ts's own
     *  push/pop/dedup logic reads this synchronously mid-callback (the same
     *  ref-read pattern it already used for the old persistedIdsRef before
     *  this extraction), and panelTreeCallbacks.ts's closePanel needs it
     *  passed in explicitly since it can no longer read displayStack off
     *  ExchangeContext's own `prev` inside its updater. */
    getDisplayStackIds: () => SP_COIN_DISPLAY[];
}
export declare function DisplayStackProvider({ children, storage, }: {
    children: ReactNode;
    /** Optional storage backend — defaults to real `window.localStorage`.
     *  A future extension build passes `chrome.storage.local`-backed
     *  versions here instead. */
    storage?: DisplayStackStorage;
}): import("react").JSX.Element;
/** Throws outside DisplayStackProvider — real, always-available state once
 *  mounted, not something that can legitimately be null for a render. Same
 *  "fail loud" contract useTestPageSettings() uses. */
export declare function useDisplayStack(): DisplayStackContextValue;
export {};
