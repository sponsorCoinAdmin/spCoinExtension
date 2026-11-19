// File: src/standalone/StandaloneProviders.tsx
//
// 2026-11-18 (docs/design/standAloneWalletInstall.txt) -- the providers the Merit Wallet component reads from its surroundings, mounted for it so a page that knows nothing about this repo can still draw the wallet.
// The wallet's panel tree, display stack and exchange context are not props: they come from React context and the engine's stores. The web app mounts them in SpCoinProviders and the extension in sidepanel.ts; this is the
// SAME stack with browser defaults (everything persisted in localStorage, no hosted-app hydration, no injected-wallet listener), so the stand-alone wallet shows the screens the other two show, from its own state.
// It is the extension's boot sequence (sidepanel.ts renderWallet) without chrome.* and without the trade hosts, which arrive with the trade layer.
'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  DisplayStackProvider,
  ExchangeProviderCore,
  PanelBootstrap,
  buildDefaultExchangeContext,
  clone as cloneContext,
  deriveStandardBootPanelState,
  disableHostApi,
  type ExchangeContextWalletSource,
  type ExchangeProviderHost,
} from '@sponsorcoin/spcoin-exchange-engine';

export interface StandaloneProvidersProps {
  /** The chain the wallet starts on. */
  chainId: number;
  /** The active account's address (undefined while there is none). */
  address?: string;
  children?: React.ReactNode;
}

let hostApiDisabled = false;

export default function StandaloneProviders({ chainId, address, children }: StandaloneProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  // The shared libraries ask a hosted app for data by default; a stand-alone wallet has none, so every such call answers 'not available' instead of fetching.
  if (!hostApiDisabled) {
    disableHostApi();
    hostApiDisabled = true;
  }
  const [host] = useState<ExchangeProviderHost>(() => ({
    initContext: async (stored, id) => {
      const base = (stored && typeof stored === 'object' ? cloneContext(stored as never) : buildDefaultExchangeContext(id)) as ReturnType<typeof buildDefaultExchangeContext>;
      base.settings = base.settings ?? {};
      base.apiCoreSyncedMembers = base.apiCoreSyncedMembers ?? buildDefaultExchangeContext(id).apiCoreSyncedMembers;
      base.apiCoreSyncedMembers = { ...base.apiCoreSyncedMembers, network: { ...base.apiCoreSyncedMembers.network, appChainId: id } };
      return base;
    },
    isMeritAuth: () => false,
    wrap: (inner) => React.createElement(DisplayStackProvider, { children: inner }),
    features: { hydrateActiveAccount: false, hydrateRoleAccounts: false, tokenRegistryRefresh: false, injectedWalletListener: false, followWalletMinimal: true },
  }));
  const walletSource: ExchangeContextWalletSource = { ready: true, address: address as ExchangeContextWalletSource['address'], isConnected: !!address, chainId };
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(ExchangeProviderCore, { walletSource, bootExtensions: { derivePanelState: deriveStandardBootPanelState as never }, host }, React.createElement(PanelBootstrap), children),
  );
}
