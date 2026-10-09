// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/walletRefresh.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt row 5, S2b-2) -- the wallet's refresh sequence, written once for both hosts.
// Before this, the web adapter (components/views/MeritWallet.tsx handleRefreshWallet) and the extension (sidepanel.ts handleRefresh)
// each ran their own copy of the same shape: set "refreshing", drop stale caches, reload what the host owns, then bump a token that makes
// MeritWallet's self-fetch run again with forceRefresh, and clear "refreshing". The host-specific parts (which caches, which reloads) are
// callbacks; the sequence, the re-entrancy guard and the "refreshing is always cleared" guarantee live here.
//
// Two forms of the same thing: createWalletRefresh is plain TypeScript (the extension adapter is a script with its own render loop, not a
// React component); useWalletRefresh wraps it in React state for hosts that are components (the web adapter).
import { useCallback, useEffect, useRef, useState } from 'react';

export interface WalletRefreshCallbacks {
  /** Drop caches that would otherwise serve stale data (runs first). Errors are the host's to swallow; a throw aborts the refresh. */
  invalidate?: () => Promise<void> | void;
  /** Reload whatever the host itself owns (runs second, after invalidate). */
  reload?: () => Promise<void> | void;
}

export interface WalletRefreshState {
  refreshing: boolean;
  /** Bumped once per completed refresh, AFTER invalidate and reload; pass it to MeritWallet's refreshToken prop. */
  refreshToken: number;
}

export interface WalletRefreshController {
  getState: () => WalletRefreshState;
  /** Runs one refresh. A call made while one is already running is ignored. */
  run: () => Promise<void>;
}

/** Framework-free refresh sequence. onChange fires after every state change (host re-renders from getState()). */
export function createWalletRefresh(callbacks: WalletRefreshCallbacks, onChange: () => void = () => undefined): WalletRefreshController {
  let state: WalletRefreshState = { refreshing: false, refreshToken: 0 };
  const set = (next: Partial<WalletRefreshState>) => {
    state = { ...state, ...next };
    onChange();
  };
  return {
    getState: () => state,
    run: async () => {
      if (state.refreshing) return;
      set({ refreshing: true });
      try {
        await callbacks.invalidate?.();
        await callbacks.reload?.();
        set({ refreshToken: state.refreshToken + 1 });
      } finally {
        set({ refreshing: false });
      }
    },
  };
}

/** React form for component hosts. The callbacks are read through a ref, so they may change identity every render. */
export function useWalletRefresh(callbacks: WalletRefreshCallbacks): WalletRefreshState & { refresh: () => Promise<void> } {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const [state, setState] = useState<WalletRefreshState>({ refreshing: false, refreshToken: 0 });
  const controllerRef = useRef<WalletRefreshController | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  if (!controllerRef.current) {
    controllerRef.current = createWalletRefresh(
      {
        invalidate: () => callbacksRef.current.invalidate?.(),
        reload: () => callbacksRef.current.reload?.(),
      },
      () => {
        if (mountedRef.current && controllerRef.current) setState(controllerRef.current.getState());
      },
    );
  }
  const refresh = useCallback(() => controllerRef.current!.run(), []);
  return { ...state, refresh };
}
