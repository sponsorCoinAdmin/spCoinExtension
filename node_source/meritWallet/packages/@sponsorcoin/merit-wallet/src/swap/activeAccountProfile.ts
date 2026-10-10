// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/swap/activeAccountProfile.ts
//
// 2026-10-09 -- the active account as the wallet's own header shows it (address, name, symbol, avatar). The wallet component provides it from the
// row it already draws in the header, so a flow that builds a receipt (the shared swap flow's ACCOUNT row) can show the same "Doggie | Hot Dog" and
// avatar instead of a bare address when the host's exchange context has not hydrated that account's profile.
'use client';

import { createContext, useContext } from 'react';

export interface ActiveAccountProfile {
  address?: string;
  name?: string;
  symbol?: string;
  /** The avatar image URL (the same one the header shows). */
  logoURL?: string;
}

export const ActiveAccountProfileContext = createContext<ActiveAccountProfile | undefined>(undefined);

export function useActiveAccountProfile(): ActiveAccountProfile | undefined {
  return useContext(ActiveAccountProfileContext);
}
