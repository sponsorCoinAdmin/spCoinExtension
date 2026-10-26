// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/TokenPanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 21) -- the preview-aware Token detail panel (TOKEN_PANEL), moved from the web app's
// components/views/RadioOverlayPanels/TokenPanel/index.tsx. Logic and markup are the web app's. It shows the token that was clicked
// (the engine's preview token, set before the panel opens), with the buy / sell token as a fallback for stale persisted state, self-heals a record that
// arrived without name / symbol / logo through the host's WalletDataProvider, clears the preview when the panel closes, and closes itself when it has
// nothing to show. Inputs that came from web-only hooks now come from the engine: the chain id from the exchange context (as TokenSlotPanels does),
// the token hooks and panel-tree hooks from @sponsorcoin/spcoin-exchange-engine. The web app's debug traces were dropped on the move.
'use client';

import { panelPartClass, metaTableClass } from '@sponsorcoin/spcoin-common/styles';
import { tokenRowClass, tokenRowStyle } from '@sponsorcoin/spcoin-common/styles';
import React, { useEffect, useState } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
import {
  defaultStaticImage,
  panelTreeOpenSourceStore,
  panelTreeTrace,
  useBuyTokenContract,
  useExchangeContext,
  usePanelTree,
  usePanelTreeOpenSource,
  usePanelVisible,
  usePreviewTokenContract,
  usePreviewTokenSource,
  useSellTokenContract,
} from '@sponsorcoin/spcoin-exchange-engine';
import { ReadOnlyMetaDataTable } from './panels';
import { tokenDetailRows } from './TokenSlotPanels';
import { useWalletData } from './walletData';

/**
 * TokenPanel
 * - Single gate: TOKEN_PANEL
 * - Displays info for the currently previewed token contract (a token logo's click handler always sets a preview token before opening this panel,
 *   so preview mode is the real path; buy / sell token are a defensive fallback for stale persisted state with no preview set).
 */
export default function TokenPanel(_props: { onClose?: () => void }) {
  const vTokenPanel = usePanelVisible(SP_COIN_DISPLAY.TOKEN_PANEL);
  const vTokenMetaData = usePanelVisible(SP_COIN_DISPLAY.TOKEN_META_DATA);
  const vTokenLogo = usePanelVisible(SP_COIN_DISPLAY.TOKEN_LOGO);
  // Specifically "is TOKEN_PANEL's own nested token picker open on top of it", not the shared ASSET_SELECT_LIST_PANEL (the list container every
  // list renders through). isTopOfStack tells a stacked picker apart from a list merely left open behind this panel.
  const vTokenList = usePanelVisible(SP_COIN_DISPLAY.REMOTE_TOKEN_LIST);

  const { closePanel, isTopOfStack } = usePanelTree();
  const fromPanelTree = usePanelTreeOpenSource(SP_COIN_DISPLAY.TOKEN_PANEL);

  const [sellToken] = useSellTokenContract();
  const [buyToken] = useBuyTokenContract();
  const [previewToken, setPreviewTokenContract] = usePreviewTokenContract();
  const [, setPreviewTokenSource] = usePreviewTokenSource();

  const isPreviewMode = previewToken != null;
  // A directly clicked preview is an unambiguous "show this" signal and is never blocked by a sibling list flag that may have been left stuck true.
  const tokenListCoversThisPanel = !isPreviewMode && vTokenList && !isTopOfStack(SP_COIN_DISPLAY.TOKEN_PANEL);
  const tokenContract: TokenContract | undefined = previewToken ?? buyToken ?? sellToken;

  // Self-heal incomplete records (e.g. the bare {address, chainId, balance} shape sellToken / buyToken can hold mid-hydration): the address is
  // known, so look the rest up instead of showing "N/A" for fields that can be resolved.
  const [hydratedRecord, setHydratedRecord] = useState<TokenContract | undefined>(undefined);
  const { exchangeContext } = useExchangeContext();
  const { loadTokenRecord } = useWalletData();
  const appChainId = exchangeContext?.apiCoreSyncedMembers?.network?.appChainId ?? 0;
  const needsHydration = !!tokenContract?.address && (!tokenContract.name || !tokenContract.symbol || !tokenContract.logoURL);

  useEffect(() => {
    if (!needsHydration || !tokenContract?.address) {
      setHydratedRecord(undefined);
      return;
    }
    const chainId = tokenContract.chainId || appChainId;
    if (!chainId || !loadTokenRecord) return;
    let cancelled = false;
    void loadTokenRecord(chainId, tokenContract.address)
      .then((record) => {
        if (!cancelled) setHydratedRecord(record);
      })
      .catch(() => undefined); // leave hydratedRecord unset: the "N/A" fallback already handles this
    return () => {
      cancelled = true;
    };
  }, [needsHydration, tokenContract?.address, tokenContract?.chainId, appChainId, loadTokenRecord]);

  const displayContract: TokenContract | undefined =
    hydratedRecord && hydratedRecord.address === tokenContract?.address ? { ...tokenContract, ...hydratedRecord } : tokenContract;

  // Clear preview state once TOKEN_PANEL closes, so a stale preview doesn't linger for the next time it opens.
  const prevVisibleRef = React.useRef<boolean>(false);
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = vTokenPanel;
    if (!wasVisible || vTokenPanel) return;
    if (previewToken) setPreviewTokenContract(undefined);
    setPreviewTokenSource(null);
  }, [vTokenPanel, previewToken, setPreviewTokenContract, setPreviewTokenSource]);

  // Auto-close when TOKEN_PANEL is open but has nothing to display (the persisted-state case: previewToken is never persisted, so after a refresh it
  // would show an empty panel forever). Skipped when opened from the debug panel tree, which is a deliberate manual force-open.
  useEffect(() => {
    if (!vTokenPanel) return;
    if (vTokenList) return;
    if (isPreviewMode) return;
    if (fromPanelTree) return;
    closePanel(SP_COIN_DISPLAY.TOKEN_PANEL, 'TokenPanel:noContent->autoClose');
  }, [vTokenPanel, isPreviewMode, vTokenList, fromPanelTree, closePanel]);

  // Once real content arrives the debug-tree signal has served its purpose; clear it so a later, genuinely empty stale open isn't also skipped.
  useEffect(() => {
    if (!fromPanelTree) return;
    if (isPreviewMode || vTokenList) panelTreeOpenSourceStore.mark(SP_COIN_DISPLAY.TOKEN_PANEL, false);
  }, [fromPanelTree, isPreviewMode, vTokenList]);

  // 2026-10-26 (diagnostic, owner report: right-clicking a token row opens
  // TOKEN_PANEL -- the title bar updates and it's correctly pushed onto the
  // displayStack, but the content area stays blank). This file had zero
  // trace instrumentation of its own ("the web app's debug traces were
  // dropped on the move," this file's own header comment), so a captured
  // log couldn't show which of the two render-gating conditions below
  // (tokenListCoversThisPanel, or no tokenContract at all) is actually
  // firing. Logged every render, right before both gates run.
  panelTreeTrace('TokenPanel:render', {
    vTokenPanel,
    vTokenMetaData,
    vTokenList,
    isTopOfStack: isTopOfStack(SP_COIN_DISPLAY.TOKEN_PANEL),
    isPreviewMode,
    tokenListCoversThisPanel,
    hasPreviewToken: previewToken != null,
    hasSellToken: sellToken != null,
    hasBuyToken: buyToken != null,
    hasTokenContract: tokenContract != null,
    tokenContractAddress: tokenContract?.address ?? null,
  });

  // early return AFTER hooks
  if (!vTokenPanel || tokenListCoversThisPanel) return null;

  if (!tokenContract) {
    return (
      <div id="TOKEN_PANEL">
        <div className={tokenRowClass.empty} style={tokenRowStyle.text}>
          <p className={tokenRowClass.emptyTitle}>No token contract selected.</p>
          <p className={tokenRowClass.emptyText}>Select a token to view its details.</p>
        </div>
      </div>
    );
  }

  const resolvedContract = displayContract ?? tokenContract;
  const logoURL = (resolvedContract.logoURL ?? '').toString().trim();
  const name = (resolvedContract.name ?? '').toString().trim();

  return (
    <div id="TOKEN_PANEL">
      {isPreviewMode && <div id="TOKEN_META_DATA_PREVIEW" className={panelPartClass.hidden} aria-hidden="true" />}
      {/* 2026-10-26 (owner report: TOKEN_META_DATA's panel-tree toggle had no effect — the table stayed on regardless) — `isPreviewMode ||`
          force-showed this block whenever a token was in preview, which is every time this overlay renders at all (tokenDetailOverlay in
          MeritWallet.tsx only builds it when previewTokenAddress is set), so vTokenMetaData's actual value was never read. Fixed by reading
          vTokenMetaData alone — AccountDetailScreen's own ACCOUNT_META_DATA has no such override.
          2026-10-26 (owner report, same day: "closing TOKEN_META_DATA also closes the logo") — ReadOnlyMetaDataTable bundles the logo and
          the table into ONE component with ONE visibility gate (the call below), so nesting it under vTokenMetaData alone tied TOKEN_LOGO's
          own toggle to TOKEN_META_DATA's. AccountDetailScreen's ACCOUNT_LOGO/ACCOUNT_META_DATA are two fully independent sibling divs, each
          reading only its own flag — TOKEN_LOGO now renders standalone (the same logoBox/logoImage markup ReadOnlyMetaDataTable draws
          internally), and the table call passes logoVisible={false} so it never draws a second, redundant copy of the image. */}
      {vTokenLogo && (logoURL || defaultStaticImage) && (
        <div id="TOKEN_LOGO" className={metaTableClass.logoBox(metaTableClass.logoContainerSize, metaTableClass.logoContainer)}>
          <img
            src={logoURL || defaultStaticImage}
            alt={name}
            className={metaTableClass.logoImage(metaTableClass.logoSize, metaTableClass.logoRounded, metaTableClass.logoBackground)}
          />
        </div>
      )}
      {vTokenMetaData && (
        <ReadOnlyMetaDataTable id="TOKEN_META_DATA" rows={tokenDetailRows(resolvedContract)} logoVisible={false} />
      )}
    </div>
  );
}
