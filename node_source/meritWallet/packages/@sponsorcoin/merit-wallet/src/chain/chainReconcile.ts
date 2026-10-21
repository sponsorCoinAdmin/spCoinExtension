// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/chain/chainReconcile.ts
//
// docs/meritMigration.txt row 25. The RULES of the web's useNetworkController, written once and free of React and wagmi: what the app does when an outside wallet (MetaMask through wagmi) connects, disconnects or sits on a different chain from the one the app
// has chosen. The web hook keeps the glue (wagmi state, the switch call and its error alert, the refs, the debug trace) and calls reconcileChain on every change of those inputs; every decision below is the original's, in the original's order.
//
// MetaMask-style rule it implements: the user's wallet chain wins when it connects fresh or changes itself; the app asks the wallet to switch only for a change the app made (a network pick) or a returning connect that disagrees.
// Pinned by test/chainReconcile.test.mjs against the original effect body (test/fixtures/useNetworkController.reconcile.original.txt) over every combination of the inputs, with mutants.

export interface ChainReconcileInput {
  /** wagmi has finished its handshake; until then nothing is trusted. */
  wagmiReady: boolean;
  walletConnected: boolean;
  walletStatus: string | undefined;
  /** The chain the wallet reports; absent or 0 until wagmi surfaces it. */
  walletChainId: number | undefined;
  /** The chain the app has chosen; 0 when none. */
  appChainId: number;
  appConnected: boolean;
  /** The network record's own chain id and connected flag (what the rest of the app reads). */
  appNetworkChainId: number;
  appNetworkConnected: boolean;
  /** The stored session came from localStorage rather than a fresh boot. */
  hydratedFromLocalStorage: boolean;
}

export interface Ref<T> {
  current: T;
}

/** The memory between runs. The host owns it (React refs); this module reads and writes `.current`. */
export interface ChainReconcileRefs {
  adoptedOnFirstConnect: Ref<boolean>;
  trustedWalletOverStoredChainOnConnect: Ref<boolean>;
  prevWalletChainId: Ref<number | undefined>;
  prevAppChainId: Ref<number | undefined>;
  prevWalletConnected: Ref<boolean>;
  lastWalletDisconnectedLogKey: Ref<string | undefined>;
}

export type SwitchPhase = 'switch-wallet-on-connect' | 'switch-wallet-on-app-change';

export interface ChainReconcileHost {
  setAppConnected(connected: boolean): void;
  /** Mirror the wallet-active chain into the network record (0 and false when disconnected). */
  syncNetworkChainId(chainId: number, connected: boolean): void;
  /** Adopt a chain as the app's own choice. */
  setAppChainId(chainId: number): void;
  /** Ask the wallet to switch to the app's chain. Errors are the host's to handle. */
  switchWalletTo(chainId: number, phase: SwitchPhase, context: { walletChainId: number; prevWallet?: number; prevApp?: number }): void;
  /** `traceWorthy` phases are the ones that change a chain or ask the wallet to switch. */
  log(phase: string, payload: Record<string, unknown>, traceWorthy: boolean): void;
}

const TRACE_WORTHY_PHASES = new Set([
  'wallet-disconnected',
  'adopt-wallet-over-stale-ls-on-first-connect',
  'switch-wallet-on-connect',
  'adopt-wallet-on-first-connect',
  'adopt-wallet',
  'switch-wallet-on-app-change',
  'adopt-wallet-on-mismatch',
]);

export function reconcileChain(input: ChainReconcileInput, refs: ChainReconcileRefs, host: ChainReconcileHost): void {
  const { wagmiReady, walletConnected, walletStatus, walletChainId, appChainId, appConnected, appNetworkChainId, appNetworkConnected, hydratedFromLocalStorage } = input;
  const walletChainIsValid = typeof walletChainId === 'number' && walletChainId > 0;

  const logState = (phase: string, extra?: Record<string, unknown>) => {
    host.log(
      phase,
      {
        wagmiReady,
        walletConnected,
        walletStatus,
        walletChainId,
        walletChainIsValid,
        appChainId,
        appConnected,
        hydratedFromLocalStorage,
        adoptedOnFirstConnect: refs.adoptedOnFirstConnect.current,
        trustedWalletOverStoredChainOnConnect: refs.trustedWalletOverStoredChainOnConnect.current,
        ...(extra ?? {}),
      },
      TRACE_WORTHY_PHASES.has(phase),
    );
  };

  // 0) Wait for the wagmi handshake: until then isConnected and chainId are not trusted.
  if (!wagmiReady) {
    logState('skip:wagmi-not-ready');
    return;
  }

  // 1) Wallet disconnected: mark the app disconnected, keep appChainId; the network record's chain id is 0 while disconnected.
  if (!walletConnected) {
    const logKey = [walletStatus, walletChainId, appChainId, appConnected, appNetworkChainId, appNetworkConnected].join(':');
    if (refs.lastWalletDisconnectedLogKey.current !== logKey) {
      refs.lastWalletDisconnectedLogKey.current = logKey;
      logState('wallet-disconnected', { msg: 'Wallet disconnected → mark appConnected=false (keep appChainId)' });
    }
    if (appConnected) host.setAppConnected(false);
    if (appNetworkChainId !== 0 || appNetworkConnected) host.syncNetworkChainId(0, false);
    refs.prevWalletConnected.current = false;
    return;
  }

  refs.lastWalletDisconnectedLogKey.current = undefined;

  const justConnected = !refs.prevWalletConnected.current && walletConnected;

  if (!appConnected) {
    logState('set-app-connected-true', { msg: 'Wallet connected → mark appConnected=true' });
    host.setAppConnected(true);
  }
  // wagmi has not surfaced a valid chain yet: nothing to reconcile.
  if (!walletChainIsValid) {
    logState('wallet-chain-invalid', { msg: 'Wallet connected but walletChainId is 0/undefined → wait' });
    return;
  }

  refs.prevWalletConnected.current = true;

  // The network record's chain id reflects the wallet-active network while connected.
  host.syncNetworkChainId(walletChainId, true);

  if (justConnected && appChainId > 0 && walletChainId !== appChainId) {
    const isFirstConnectThisSession = !refs.trustedWalletOverStoredChainOnConnect.current;
    refs.trustedWalletOverStoredChainOnConnect.current = true;

    // First connect of this page load, and the app's chain came from a restored session rather than a choice made just now: trust the wallet instead of forcing it onto a possibly stale remembered chain.
    // Every later mismatch (an in-app network pick, a wallet change, a second connect) still switches the wallet.
    if (hydratedFromLocalStorage && isFirstConnectThisSession) {
      logState('adopt-wallet-over-stale-ls-on-first-connect', {
        msg: 'First connect this session; stored appChainId came from localStorage and disagrees with the connecting wallet -> trust the wallet, adopt its chain instead of forcing a switch',
      });
      host.setAppChainId(walletChainId);
      return;
    }

    logState('switch-wallet-on-connect', {
      msg: 'Just connected and wallet chain mismatched appChainId -> switch wallet to appChainId',
    });
    host.switchWalletTo(appChainId, 'switch-wallet-on-connect', { walletChainId });
    return;
  }

  // 2) Fresh boot with nothing stored, the app still on the default chain 1, the wallet already elsewhere: adopt the wallet's chain (once).
  if (!hydratedFromLocalStorage && !refs.adoptedOnFirstConnect.current && appChainId === 1 && walletChainId !== 1) {
    refs.adoptedOnFirstConnect.current = true;
    logState('adopt-wallet-on-first-connect', {
      msg: 'Fresh boot (no LS) + default appChainId=1 + wallet on non-1 → adopt walletChainId',
    });
    host.setAppChainId(walletChainId);
    return;
  }

  // 3) No app network chosen yet: adopt the wallet's.
  if (!appChainId || appChainId === 0) {
    logState('adopt-wallet', { msg: 'appChainId is 0 → adopt walletChainId as appChainId (Case B)' });
    host.setAppChainId(walletChainId);
    return;
  }

  // 4) Both have a chain and they disagree: if the app changed and the wallet did not, the app drove it (switch the wallet); otherwise the wallet drove it (adopt it).
  if (walletChainId !== appChainId) {
    const prevWallet = refs.prevWalletChainId.current;
    const prevApp = refs.prevAppChainId.current;
    const walletChanged = typeof prevWallet === 'number' && prevWallet !== walletChainId;
    const appChanged = typeof prevApp === 'number' && prevApp !== appChainId;

    if (appChanged && !walletChanged) {
      logState('switch-wallet-on-app-change', { msg: 'App chain changed while wallet stayed same -> switch wallet', prevWallet, prevApp });
      host.switchWalletTo(appChainId, 'switch-wallet-on-app-change', { walletChainId, prevWallet, prevApp });
    } else {
      logState('adopt-wallet-on-mismatch', { msg: 'Wallet chain changed or both changed -> adopt walletChainId in app', prevWallet, prevApp });
      host.setAppChainId(walletChainId);
    }
    return;
  }

  // 5) Already aligned.
  logState('noop', { msg: 'Wallet and app chain already aligned → no action' });

  refs.prevWalletChainId.current = walletChainId;
  refs.prevAppChainId.current = appChainId;
  refs.prevWalletConnected.current = walletConnected;
}
