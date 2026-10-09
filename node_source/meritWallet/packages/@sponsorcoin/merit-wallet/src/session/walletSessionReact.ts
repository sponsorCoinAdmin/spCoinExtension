// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/session/walletSessionReact.ts
//
// 2026-10-08 (table row 15) -- React binding for walletSession.ts, the same shape as useWalletRefresh: the controller is created once per mount and
// the hook re-renders the host on every change. Returns the state plus the props the Merit Wallet component's password screen takes.
import { useEffect, useRef, useState } from 'react';
import { createWalletSession, passwordModeFor, type WalletPasswordMode, type WalletSessionAdapter, type WalletSessionController, type WalletSessionState } from './walletSession';

export interface UseWalletSessionResult extends WalletSessionState {
  passwordMode: WalletPasswordMode;
  onPasswordSubmit: (password: string, confirmPassword: string) => void;
  refresh: () => Promise<void>;
  lock: () => Promise<void>;
  dismissRecoveryPhrase: () => void;
}

export function useWalletSession(adapter: WalletSessionAdapter): UseWalletSessionResult {
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;
  const mountedRef = useRef(true);
  const controllerRef = useRef<WalletSessionController | null>(null);
  const [state, setState] = useState<WalletSessionState>({ phase: 'checking', error: '', submitting: false });
  if (!controllerRef.current) {
    controllerRef.current = createWalletSession(
      {
        status: () => adapterRef.current.status(),
        create: (p) => adapterRef.current.create(p),
        unlock: (p) => adapterRef.current.unlock(p),
        lock: () => (adapterRef.current.lock ? adapterRef.current.lock() : Promise.resolve()),
      },
      () => {
        if (mountedRef.current && controllerRef.current) setState(controllerRef.current.getState());
      },
    );
  }
  const controller = controllerRef.current;
  useEffect(() => {
    mountedRef.current = true;
    void controller.refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [controller]);
  return {
    ...state,
    passwordMode: passwordModeFor(state.phase),
    onPasswordSubmit: (password, confirmPassword) => void controller.submit(password, confirmPassword),
    refresh: controller.refresh,
    lock: controller.lock,
    dismissRecoveryPhrase: controller.dismissRecoveryPhrase,
  };
}
