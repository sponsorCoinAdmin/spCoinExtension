// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/ConnectedNetworkPanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, row 8 / S2b-4b) -- the network detail overlay (NETWORK_PANEL), wired to the exchange engine,
// written once for both hosts. It is the web app's components/views/RadioOverlayPanels/NetworkPanel/index.tsx moved: same gates, same
// preview-then-live logic, same rows. Where the inputs come from is what changed, the MetaMask way (one network registry that every screen
// reads, like its NetworkController):
//   - the preview store is the engine's (previewNetworkStore, moved there unchanged);
//   - a chain's name, symbol, logo, explorer and RPC come from spcoin-feeds' network registry (getNetworkConfiguration);
//   - the host may override how the live network and a previewed chain are resolved, and how the extra info.json fields are loaded: the web
//     app does, so what it shows stays exactly what it showed (it still resolves names and symbols through its own helpers until those are
//     rebased on the registry, a separate step: the two sources differ for Base, Polygon and Sepolia).
// A host that passes nothing gets the registry defaults, which is what the extension uses.
'use client';

import { tokenRowClass, tokenRowStyle, walletPartClass } from '@sponsorcoin/spcoin-common/styles';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CopyBtn } from './TokenSlotPanels';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { NetworkElement } from '@sponsorcoin/spcoin-common/context';
import {
  defaultMissingImage,
  previewNetworkStore,
  useExchangeContext,
  usePanelVisible,
  usePreviewNetworkChainId,
} from '@sponsorcoin/spcoin-exchange-engine';
import { getNetworkConfiguration } from '@sponsorcoin/spcoin-feeds/networks';
import { getNetworkMetaData } from '@sponsorcoin/spcoin-panels';
import { ReadOnlyMetaDataTable } from './panels';
import { useWalletData } from './walletData';

// The extra fields a NetworkElement does not carry but each network's own info.json does (website, description).
interface NetworkInfoFile {
  website?: string;
  description?: string;
}

/** A NetworkElement for a chain id straight from the registry (the default for previewing a chain other than the live one). */
export function networkElementFromRegistry(chainId: number): NetworkElement {
  const cfg = getNetworkConfiguration(chainId);
  return {
    connected: false,
    appChainId: 0,
    chainId,
    name: cfg?.name ?? '',
    symbol: cfg?.symbol ?? '',
    logoURL: cfg?.logoURL ?? '',
    url: cfg?.explorerUrl ?? '',
    rpcUrl: cfg?.rpcUrl ?? '',
  };
}

export interface LiveNetwork {
  network: NetworkElement & Record<string, unknown>;
  chainId: number;
}

/** Default live network: the exchange context's network, filled in from the registry the way the web app's useNetwork fills it from its helpers. */
export function useLiveNetworkFromContext(): LiveNetwork {
  const { exchangeContext } = useExchangeContext();
  const ctxNet = (exchangeContext?.apiCoreSyncedMembers?.network ?? {}) as Partial<NetworkElement>;
  const chainId = ctxNet.appChainId || 0;
  const cfg = getNetworkConfiguration(chainId);
  const network = {
    ...ctxNet,
    chainId,
    name: ctxNet.name || cfg?.name || '',
    logoURL: ctxNet.logoURL || cfg?.logoURL || '',
    url: ctxNet.url || cfg?.explorerUrl || '',
    rpcUrl: ctxNet.rpcUrl || '',
    connected: !!ctxNet.connected,
  } as NetworkElement & Record<string, unknown>;
  return { network, chainId };
}

export interface ConnectedNetworkPanelProps {
  onClose?: () => void;
  /** Host hook for the live network (stable module-level function). Default: the exchange context filled from the registry. */
  useLiveNetwork?: () => LiveNetwork;
}

export default function ConnectedNetworkPanel({ useLiveNetwork = useLiveNetworkFromContext }: ConnectedNetworkPanelProps) {
  const vNetworkPanel = usePanelVisible(SP_COIN_DISPLAY.NETWORK_PANEL);
  const vNetworkMetaData = usePanelVisible(SP_COIN_DISPLAY.NETWORK_META_DATA);
  const vNetworkLogo = usePanelVisible(SP_COIN_DISPLAY.NETWORK_LOGO);
  const { resolveNetwork, loadNetworkInfo } = useWalletData();

  const { network: liveNetwork, chainId: liveChainId } = useLiveNetwork();
  const previewChainId = usePreviewNetworkChainId();
  const isPreviewMode = previewChainId != null;

  const previewNetwork: NetworkElement | undefined = useMemo(
    () => (isPreviewMode ? (resolveNetwork ?? networkElementFromRegistry)(previewChainId as number) : undefined),
    [isPreviewMode, previewChainId, resolveNetwork],
  );

  const network = previewNetwork ?? liveNetwork;
  const chainId = isPreviewMode ? (previewChainId as number) : liveChainId;

  // Self-heal the fields NetworkElement doesn't carry (website/description) from the network's own info.json.
  const [info, setInfo] = useState<NetworkInfoFile | undefined>(undefined);

  useEffect(() => {
    if (!vNetworkPanel || !chainId) {
      setInfo(undefined);
      return;
    }
    let cancelled = false;
    const load = loadNetworkInfo
      ? loadNetworkInfo(chainId)
      : fetch(`/assets/blockchains/${chainId}/info.json`).then((res) => (res.ok ? (res.json() as Promise<NetworkInfoFile>) : undefined));
    load
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setInfo(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [vNetworkPanel, chainId, loadNetworkInfo]);

  // Clear the preview once NETWORK_PANEL closes, so a stale preview doesn't linger for the next time it's opened.
  const prevVisibleRef = useRef<boolean>(false);
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = vNetworkPanel;
    if (!wasVisible || vNetworkPanel) return;
    previewNetworkStore.clear();
  }, [vNetworkPanel]);

  if (!vNetworkPanel) return null;

  if (!chainId) {
    return (
      <div id="NETWORK_PANEL">
        <div className={tokenRowClass.empty} style={tokenRowStyle.text}>
          <p className={tokenRowClass.emptyTitle}>No network selected.</p>
          <p className={tokenRowClass.emptyText}>Select a network to view its details.</p>
        </div>
      </div>
    );
  }

  const resolvedNetwork = { ...network, ...info };
  const logoURL = (resolvedNetwork.logoURL ?? '').toString().trim();
  const name = (resolvedNetwork.name ?? '').toString().trim();

  const rows = getNetworkMetaData(resolvedNetwork).map((f) => {
    if (!f.value) return { label: f.label, value: 'N/A' };

    if (f.kind === 'url') {
      return {
        label: f.label,
        value: (
          <span className={tokenRowClass.cell}>
            <a href={f.value} target="_blank" rel="noopener noreferrer"
              className={tokenRowClass.link}>
              {f.value}
            </a>
            <CopyBtn text={f.value} />
          </span>
        ),
      };
    }

    return { label: f.label, value: f.value };
  });

  return (
    <div id="NETWORK_PANEL">
      {vNetworkMetaData && (
        <ReadOnlyMetaDataTable
          rows={rows}
          logoURL={logoURL || defaultMissingImage}
          logoAlt={name}
          logoVisible={vNetworkLogo}
          // Network logos are already complete, self-contained circular brand marks with real transparent padding, so no navy fill behind
          // them and no card frame around them (unlike token and account logos).
          logoBackgroundClassName={walletPartClass.networkLogo.background}
          logoContainerClassName={walletPartClass.networkLogo.container}
        />
      )}
    </div>
  );
}
