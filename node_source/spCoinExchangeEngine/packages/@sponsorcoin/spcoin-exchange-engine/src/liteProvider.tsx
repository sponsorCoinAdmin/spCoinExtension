// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/liteProvider.tsx
//
// 2026-09-18, Phase B.2 Stage 1.a (see the approved plan at
// .claude/plans/warm-questing-cookie.md) — a small, self-contained
// ExchangeContext producer for a consumer that isn't the full web app.
// Deliberately NOT a lighter mode of the web app's own
// lib/context/ExchangeProvider.tsx (ExchangeProviderInner): that file's
// boot path statically imports accountHydration.ts (Next.js API-route
// calling code) at module level — even with hydration effects that never
// fire, the import graph would still load into a Vite bundle untested.
// This file has NONE of that code at all: no hydration, no wagmi, no
// window.ethereum listener, no Merit-mimic verification instrumentation.
// Only what's needed to make ExchangeContextState.Provider real: boot
// (read persisted state or build a minimal default), the write pipeline
// (same pluggable middleware/persist shape as the web app's Provider),
// and the setters ExchangeContextType requires.
//
// What this deliberately does NOT do (see the plan's later stages):
// account/token hydration (Stage 3), a real wallet source (Stage 2 — this
// file just takes whatever ExchangeContextWalletSource it's given), real
// chain-switching network derivation (setAppChainId here is a plain field
// update, not the web app's richer deriveNetworkFromApp lookup — nothing
// in a Stage-1 consumer needs that yet).

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type {
  ExchangeContext,
  TokenContract,
  spCoinAccount,
} from '@sponsorcoin/spcoin-common/context';
import { TRADE_DIRECTION, STATUS } from '@sponsorcoin/spcoin-common/context';
import {
  ExchangeContextState,
  EMPTY_WRITE_MIDDLEWARE,
  NOOP_PERSIST,
  DEFAULT_BOOT_PANEL_EXTENSION,
  DEFAULT_STORAGE_READ,
  clone,
  type ExchangeContextType,
  type ExchangeContextWriteExtensions,
  type ExchangeContextBootExtensions,
  type ExchangeContextStorageExtensions,
  type ExchangeContextWalletSource,
} from './exchangeContextContract';
import { DisplayStackProvider, type DisplayStackStorage } from './panelTree/displayStackStore';

/** BigInt-safe stringify, local — same shape as debugLogger.ts's own
 *  serializeWithBigInt, kept separate since this one has a different job
 *  (write-diff comparison, not log formatting). */
function stringifyWithBigInt(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v));
}

/** Minimal, structurally-valid cold-boot default — every field
 *  ExchangeContext/APICoreSyncedMembers/TradeData require, nothing more.
 *  See exchangeContextContract.ts's own ExchangeContextWalletSource doc
 *  comment for why chainId is always a real number, never undefined. */
export function buildDefaultExchangeContext(chainId: number): ExchangeContext {
  return {
    apiCoreSyncedMembers: {
      accounts: {},
      network: {
        connected: false,
        appChainId: chainId,
        chainId,
        logoURL: '',
        name: '',
        symbol: '',
        url: '',
        rpcUrl: '',
      },
      tradeData: {
        rateRatio: 0,
        slippage: { bps: 0, percentage: 0, percentageString: '0%' },
        tradeDirection: TRADE_DIRECTION.SELL_EXACT_OUT,
      },
      activeTokens: {},
      displayPanels: [],
    },
    settings: {},
    errorMessage: undefined,
  };
}

/** Minimal, address-only account record — matches the web app's own
 *  makeAccountFallback shape (STATUS.INFO, empty name/symbol/website/
 *  description, zero balance) for a just-connected/unlocked account with
 *  no hydrated metadata yet. Real name/symbol/logo/balance hydration is
 *  Stage 3's job, not this file's. */
function makeMinimalAccountFallback(address: string): spCoinAccount {
  return {
    address: address as spCoinAccount['address'],
    name: '',
    symbol: '',
    type: '',
    website: '',
    description: '',
    status: STATUS.INFO,
    balance: BigInt(0),
  };
}

export interface LiteExchangeProviderProps {
  // Optional in the type (not required, though a real caller always
  // passes real children) — plain React.createElement(Type, props,
  // ...children) call sites (no JSX transform, e.g. the extension's
  // sidepanel.ts) don't get TS's JSX-specific children/props merging, so
  // a required `children` here would reject every such call site's
  // props object even though React itself attaches children correctly at
  // runtime regardless.
  children?: ReactNode;
  /** See ExchangeContextWalletSource's own doc comment — a real
   *  wagmi/viem-backed source, or a stub while Stage 2 hasn't landed for
   *  this consumer yet. */
  walletSource: ExchangeContextWalletSource;
  writeExtensions?: ExchangeContextWriteExtensions;
  bootExtensions?: ExchangeContextBootExtensions;
  storageExtensions?: ExchangeContextStorageExtensions;
  // 2026-09-21, Path A — forwarded straight to the DisplayStackProvider
  // this component already mounts internally (see the doc comment right
  // above that mount below). Omit to keep DisplayStackProvider's own
  // default (real window.localStorage, which already works as-is in a
  // side-panel document) — this exists so a consumer that wants a real
  // chrome.storage.local-backed navigation-stack persistence can supply
  // one without this file needing to change again.
  displayStackStorage?: DisplayStackStorage;
}

/**
 * A minimal, portable ExchangeContext producer. Mount this instead of the
 * web app's ExchangeProvider for a consumer that doesn't need (or can't
 * yet support) hydration/wagmi/Merit-mimic instrumentation — currently
 * the extension (Stage 1). Same extension-point contract
 * (writeExtensions/bootExtensions/storageExtensions) the web app's own
 * Provider already uses, so a consumer's own real implementations plug in
 * exactly the same way.
 */
export function LiteExchangeProvider({
  children,
  walletSource,
  writeExtensions,
  bootExtensions,
  storageExtensions,
  displayStackStorage,
}: LiteExchangeProviderProps) {
  const middleware = writeExtensions?.middleware ?? EMPTY_WRITE_MIDDLEWARE;
  const persist = writeExtensions?.persist ?? NOOP_PERSIST;
  const derivePanelState = bootExtensions?.derivePanelState ?? DEFAULT_BOOT_PANEL_EXTENSION;
  const readStorage = storageExtensions?.read ?? DEFAULT_STORAGE_READ;

  const [contextState, setContextState] = useState<ExchangeContext | undefined>(undefined);
  const [errorMessage, setErrorMessageRaw] = useState<ExchangeContextType['errorMessage']>();
  const setErrorMessage = useCallback((error: ExchangeContextType['errorMessage']) => {
    setErrorMessageRaw(error);
  }, []);
  const hasInitializedRef = useRef(false);

  const setExchangeContext = useCallback(
    (updater: (prev: ExchangeContext) => ExchangeContext, _hookName = 'unknown') => {
      setContextState((prev) => {
        if (!prev) return prev;

        const prevStr = stringifyWithBigInt(prev);
        const nextRaw = updater(prev);
        if (!nextRaw) return prev;

        let nextBase = clone(nextRaw);
        nextBase.settings = nextBase.settings ?? {};

        for (const mw of middleware) {
          nextBase = mw(nextBase, prev);
        }

        const changed = prevStr !== stringifyWithBigInt(nextBase);
        persist(prev, nextBase, { changed });

        return changed ? nextBase : prev;
      });
    },
    [middleware, persist],
  );

  useEffect(() => {
    if (!walletSource.ready) return;
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    (async () => {
      try {
        const stored = await readStorage();
        const base: ExchangeContext =
          stored && typeof stored === 'object'
            ? clone(stored as ExchangeContext)
            : buildDefaultExchangeContext(walletSource.chainId);

        base.settings = base.settings ?? {};
        base.apiCoreSyncedMembers = base.apiCoreSyncedMembers ?? buildDefaultExchangeContext(walletSource.chainId).apiCoreSyncedMembers;

        const { displayPanels } = derivePanelState({
          settingsAny: { ...base.settings, displayPanels: base.apiCoreSyncedMembers.displayPanels },
          appChainId: walletSource.chainId,
        });

        base.apiCoreSyncedMembers = {
          ...base.apiCoreSyncedMembers,
          network: { ...base.apiCoreSyncedMembers.network, appChainId: walletSource.chainId },
          displayPanels,
        };

        for (const mw of middleware) {
          mw(base, base);
        }

        persist(undefined, base, { changed: true });
        setContextState(base);
      } catch (error) {
        // 2026-09-18, real bug found live ("extension opens, no content")
        // — this whole boot sequence used to be an unhandled async IIFE:
        // any exception (a malformed persisted blob from readStorage(),
        // a throwing middleware, etc.) rejected silently and
        // contextState never got set — LiteExchangeProvider returns null
        // while !contextState, so the entire tree rendered nothing,
        // forever, with zero visible error unless a developer happened to
        // check the console. Logged loudly now, and falls back to a
        // fresh default context instead of hanging blank forever — a
        // consumer seeing its OWN persisted state fail to parse is better
        // served by a working reset than a permanently empty screen.
        // eslint-disable-next-line no-console
        console.error('[LiteExchangeProvider] boot failed, falling back to a fresh default context:', error);
        setContextState(buildDefaultExchangeContext(walletSource.chainId));
      }
    })();
  }, [walletSource.ready, walletSource.chainId, derivePanelState, middleware, persist, readStorage]);

  // 2026-09-18, Phase B.2 Stage 2.c — reacts to walletSource.address/
  // .isConnected changing AFTER boot (e.g. a real unlock completing).
  // Mirrors the shape of the web app's real active-account watcher
  // (ExchangeProvider.tsx), deliberately minimal: writes only
  // `{address}` — no hydration (name/logo/balance), that's Stage 3's job.
  // Skipped on the same render that just booted (contextState still
  // undefined then) — this only handles CHANGES after a real context
  // exists to write into.
  const bootWalletAddressRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!contextState) return;
    if (bootWalletAddressRef.current === undefined) {
      // First render with a real context — record the starting address
      // (normally undefined, the stub) without writing anything; only a
      // genuine CHANGE from here on should trigger a write.
      bootWalletAddressRef.current = walletSource.address ?? '';
      return;
    }
    const nextAddress = walletSource.address ?? '';
    if (bootWalletAddressRef.current === nextAddress) return;
    bootWalletAddressRef.current = nextAddress;

    setExchangeContext((prev) => {
      const next = clone(prev);
      next.apiCoreSyncedMembers.accounts = {
        ...next.apiCoreSyncedMembers.accounts,
        activeAccount:
          walletSource.isConnected && walletSource.address
            ? makeMinimalAccountFallback(walletSource.address)
            : undefined,
      };
      return next;
    }, 'liteProvider:walletSourceChanged');
  }, [contextState, walletSource.address, walletSource.isConnected, setExchangeContext]);

  /* --------------------------------- setters -------------------------------- */
  // Deliberately simple field-assignment setters, not the web app's own
  // useProviderSetters.ts (which pulls in deriveNetworkFromApp's richer
  // per-chain name/symbol/logo/rpcUrl lookup table — real web-app network
  // config this consumer doesn't need yet for Stage 1's checkpoint).

  const setSellAmount = useCallback((amount: bigint) => {
    setExchangeContext((prev) => {
      const next = clone(prev);
      if (next.apiCoreSyncedMembers.tradeData.sellTokenContract) {
        next.apiCoreSyncedMembers.tradeData.sellTokenContract.amount = amount;
      }
      return next;
    }, 'setSellAmount');
  }, [setExchangeContext]);

  const setBuyAmount = useCallback((amount: bigint) => {
    setExchangeContext((prev) => {
      const next = clone(prev);
      if (next.apiCoreSyncedMembers.tradeData.buyTokenContract) {
        next.apiCoreSyncedMembers.tradeData.buyTokenContract.amount = amount;
      }
      return next;
    }, 'setBuyAmount');
  }, [setExchangeContext]);

  const setSellBalance = useCallback((balance: bigint) => {
    setExchangeContext((prev) => {
      const next = clone(prev);
      if (next.apiCoreSyncedMembers.tradeData.sellTokenContract) {
        next.apiCoreSyncedMembers.tradeData.sellTokenContract.balance = balance;
      }
      return next;
    }, 'setSellBalance');
  }, [setExchangeContext]);

  const setBuyBalance = useCallback((balance: bigint) => {
    setExchangeContext((prev) => {
      const next = clone(prev);
      if (next.apiCoreSyncedMembers.tradeData.buyTokenContract) {
        next.apiCoreSyncedMembers.tradeData.buyTokenContract.balance = balance;
      }
      return next;
    }, 'setBuyBalance');
  }, [setExchangeContext]);

  const setSellTokenContract = useCallback((contract: TokenContract | undefined) => {
    setExchangeContext((prev) => {
      const next = clone(prev);
      next.apiCoreSyncedMembers.tradeData.sellTokenContract = contract;
      return next;
    }, 'setSellTokenContract');
  }, [setExchangeContext]);

  const setBuyTokenContract = useCallback((contract: TokenContract | undefined) => {
    setExchangeContext((prev) => {
      const next = clone(prev);
      next.apiCoreSyncedMembers.tradeData.buyTokenContract = contract;
      return next;
    }, 'setBuyTokenContract');
  }, [setExchangeContext]);

  const setSendTokenContract = useCallback((contract: TokenContract | undefined) => {
    setExchangeContext((prev) => {
      const next = clone(prev);
      next.apiCoreSyncedMembers.tradeData.sendTokenContract = contract;
      return next;
    }, 'setSendTokenContract');
  }, [setExchangeContext]);

  const setPreviewTokenContract = useCallback((contract: TokenContract | undefined) => {
    setExchangeContext((prev) => {
      const next = clone(prev);
      next.apiCoreSyncedMembers.tradeData.previewTokenContract = contract;
      return next;
    }, 'setPreviewTokenContract');
  }, [setExchangeContext]);

  const setPreviewTokenSource = useCallback((source: 'BUY' | 'SELL' | null) => {
    setExchangeContext((prev) => {
      const next = clone(prev);
      next.apiCoreSyncedMembers.tradeData.previewTokenSource = source;
      return next;
    }, 'setPreviewTokenSource');
  }, [setExchangeContext]);

  const setTradeDirection = useCallback((type: TRADE_DIRECTION) => {
    setExchangeContext((prev) => {
      const next = clone(prev);
      next.apiCoreSyncedMembers.tradeData.tradeDirection = type;
      return next;
    }, 'setTradeDirection');
  }, [setExchangeContext]);

  const setSlippageBps = useCallback((bps: number) => {
    setExchangeContext((prev) => {
      const next = clone(prev);
      next.apiCoreSyncedMembers.tradeData.slippage.bps = bps;
      return next;
    }, 'setSlippageBps');
  }, [setExchangeContext]);

  const setRecipientAccount = useCallback((wallet: spCoinAccount | undefined) => {
    setExchangeContext((prev) => {
      const next = clone(prev);
      next.apiCoreSyncedMembers.accounts.recipientAccount = wallet;
      return next;
    }, 'setRecipientAccount');
  }, [setExchangeContext]);

  const setAppChainId = useCallback((chainId: number) => {
    setExchangeContext((prev) => {
      const next = clone(prev);
      next.apiCoreSyncedMembers.network = {
        ...next.apiCoreSyncedMembers.network,
        appChainId: chainId,
        chainId,
      };
      return next;
    }, 'setAppChainId');
  }, [setExchangeContext]);

  if (!contextState) return null;

  return (
    <ExchangeContextState.Provider
      value={{
        exchangeContext: { ...contextState, errorMessage },
        setExchangeContext,
        setSellAmount,
        setBuyAmount,
        setSellBalance,
        setBuyBalance,
        setSellTokenContract,
        setBuyTokenContract,
        setSendTokenContract,
        setPreviewTokenContract,
        setPreviewTokenSource,
        setTradeDirection,
        setSlippageBps,
        setRecipientAccount,
        setAppChainId,
        errorMessage,
        setErrorMessage,
      }}
    >
      {/* 2026-09-18, real bug found live ("useDisplayStack must be used
          within a DisplayStackProvider") — usePanelTree() (used by
          PanelBootstrap, which every consumer of this provider mounts)
          calls useDisplayStack() internally. The web app's own
          ExchangeProviderInner nests DisplayStackProvider inside its
          ExchangeContextState.Provider; this file mirrored the latter but
          missed the former when it was first written (Stage 1.a) — it
          only existed to make ExchangeContextState.Provider real, and the
          panel-tree runtime's OWN provider requirement wasn't accounted
          for. Default storage (real window.localStorage) was fine at the
          time — same self-contained fallback DisplayStackProvider already
          uses when no storage prop is given; still the default here, a
          consumer now opts into something else (e.g. a real
          chrome.storage.local backend) via displayStackStorage above. */}
      <DisplayStackProvider storage={displayStackStorage}>{children}</DisplayStackProvider>
    </ExchangeContextState.Provider>
  );
}
