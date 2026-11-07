// File: src/provider/useMeritLink.ts
//
// 2026-11-07 (owner request): the ONE hook behind useMeritExtension (web app) and useMeritWebApp (extension): is the other Merit wallet connected? "Connected" is the merit-connect link's own answer (SideConfig.link().connected): the other wallet answers and the person has not
// disconnected it. It is asked, never remembered (rule R5, docs/design/meritConnectRules.txt). The host supplies where the link is read and heard; this file is only the React side of it.
import { useSyncExternalStore } from 'react';

/** The part of a merit-connect side (SideConfig) this hook reads. */
export interface MeritLinkSource {
  link(): { connected: boolean };
  subscribeLink(listener: () => void): () => void;
}

export function useMeritLink(source: MeritLinkSource): boolean {
  return useSyncExternalStore(
    (listener) => source.subscribeLink(listener),
    () => source.link().connected,
    () => false,
  );
}
