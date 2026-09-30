// File: node_source/spCoinPanels/AssetSelectDropDowns/TokenSelectDropDown.tsx

'use client';

import { useCallback } from 'react';
import { FEED_TYPE, SP_COIN_DISPLAY } from '@/lib/structure';
import type { TokenContract } from '@/lib/structure';
import { useBuyTokenContract, useSellTokenContract } from '@/lib/context/hooks';
import { createDebugLogger } from '@/lib/utils/debugLogger';
import { clearFSMTraceFromMemory } from '@/components/debug/FSMTracePanel';
import { usePanelVisible } from '@/lib/context/exchangeContext/hooks/usePanelVisible';
import { useOpenActiveListPanel } from '@/lib/context/exchangeContext/hooks/useOpenActiveListPanel';
import TokenLogo from '@/components/utility/TokenLogo';
import PanelGate from '@/components/utility/PanelGate';
import { TokenSelectDropDown as PortableTokenSelectDropDown } from '@sponsorcoin/spcoin-panels';

const LOG_TIME = false;
const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_LOG_TOKEN_SELECT_DROP_DOWN === 'true';
const debugLog = createDebugLogger('TokenSelectDropDown', DEBUG_ENABLED, LOG_TIME);

interface CommonProps {
  chevronPanelId?: SP_COIN_DISPLAY;
  style?: React.CSSProperties;
  /** Panel id this instance is gated by. If omitted, renders unconditionally (matches today's behavior). */
  panelGateId?: SP_COIN_DISPLAY;
  /**
   * Bitmask (see ASSET_SELECT_DISPLAY, re-exported from AssetSelectDropDown)
   * controlling which sub-elements render. Defaults to today's unconditional
   * look (ICON | ADDRESS | COPY | ADDR_COMP, plus CHEVRON_DN whenever
   * chevronPanelId is set).
   */
  showDisplay?: number;
  /** Override the default chevron click behavior (opens ASSET_LIST_SELECT_PANEL). */
  onSelectClick?: (e: React.SyntheticEvent) => void;
  /**
   * Optional separate click handler for the address text only. When provided,
   * clicking the address stops propagation and calls this instead of doing
   * nothing (today's default — the address text has no click behavior).
   */
  onAddressClick?: (e: React.MouseEvent) => void;
  /** Fallback label shown when no token is selected yet. */
  label?: string;
  /**
   * Chars kept before/after the "..." filler (see the portable component).
   * Defaults to 4 — today's look.
   */
  addrPrePostSize?: number;
  /** Show the "$symbol | $name" line above the address. Defaults to false (today's look). No effect when `showDisplay` is explicitly given. */
  showSymbol?: boolean;
  /** Show the "$symbol | $name" line above the address. Defaults to false (today's look). No effect when `showDisplay` is explicitly given. */
  showName?: boolean;
  /** Forwarded through — see the portable component's own doc comment. */
  collapseKey?: unknown;
  /** Forwarded through — see the portable component's own doc comment. */
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * Forwarded through — when true, only the chevron opens the token list; the
   * rest of the pill (including the icon) is otherwise inert to row-open
   * clicks. Defaults to false — today's behavior.
   */
  restrictRowClickToChevron?: boolean;
  /**
   * Feed type used when opening the token list. Defaults to
   * REMOTE_TOKEN_LIST — the only feed either mode needs today. Exposed so a
   * future token-scoped feed variant doesn't need another prop-shape change.
   */
  feedType?: FEED_TYPE;
}

interface ContainerModeProps extends CommonProps {
  containerType: SP_COIN_DISPLAY.SELL_SELECT_PANEL | SP_COIN_DISPLAY.ZERO_X_SELECT_PANEL;
}

interface ControlledModeProps extends CommonProps {
  containerType?: undefined;
  /**
   * Controlled mode (e.g. SendSelectPanel) — caller owns the token value and
   * commit target instead of deriving them from the Swap/Sponsor tabs' own
   * sell/buy context.
   */
  token: TokenContract | undefined;
  onCommit: (token: TokenContract) => void;
  /** Excluded from the opened token list, mirroring containerType mode's opposite-side exclusion. Optional — controlled mode has no swap/sponsor peer by default. */
  peerAddress?: string;
  /** Which detail panel the token icon opens. Defaults to TOKEN_PANEL — controlled mode has no swap/sponsor-tab visibility to derive a dedicated panel from. */
  targetPanel?: SP_COIN_DISPLAY;
}

type Props = ContainerModeProps | ControlledModeProps;

export default function TokenSelectDropDown(props: Props) {
  return props.containerType !== undefined ? (
    <TokenSelectDropDownContainerMode {...props} />
  ) : (
    <TokenSelectDropDownControlledMode {...props} />
  );
}

function TokenSelectDropDownContainerMode(props: ContainerModeProps) {
  const { containerType, ...rest } = props;
  const [sellTokenContract, setSellTokenContract] = useSellTokenContract();
  const [buyTokenContract, setBuyTokenContract] = useBuyTokenContract();

  const isSellRoot = containerType === SP_COIN_DISPLAY.SELL_SELECT_PANEL;
  const tokenContract = isSellRoot ? sellTokenContract : buyTokenContract;

  // Which of the 4 dedicated buy/sell detail panels the token icon opens —
  // see TOKEN_BUY_PANEL's own enum doc comment. This component is shared by
  // both the Swap tab and the Sponsor tab (both read/write the same
  // tradeData.sellTokenContract/buyTokenContract pair — see
  // useTradeTokenTabSync.ts), so which owning tab is currently visible
  // decides which pair of panels applies; falls back to the generic
  // TOKEN_PANEL when neither tab is open (shouldn't happen in practice,
  // since this dropdown only renders while one of them is).
  const swapTabVisible = usePanelVisible(SP_COIN_DISPLAY.TRADING_STATION_PANEL);
  const sponsorTabVisible = usePanelVisible(SP_COIN_DISPLAY.SPONSORSHIP_PANEL);
  const targetPanel = swapTabVisible
    ? isSellRoot
      ? SP_COIN_DISPLAY.TOKEN_SELL_SWAP_PANEL
      : SP_COIN_DISPLAY.TOKEN_BUY_SWAP_PANEL
    : sponsorTabVisible
      ? isSellRoot
        ? SP_COIN_DISPLAY.TOKEN_SELL_PANEL
        : SP_COIN_DISPLAY.TOKEN_BUY_PANEL
      : SP_COIN_DISPLAY.TOKEN_PANEL;

  return (
    <TokenSelectDropDownView
      {...rest}
      dataPanelRoot={isSellRoot ? 'sell' : 'buy'}
      openMethodSuffix={isSellRoot ? 'openSellTokenList' : 'openBuyTokenList'}
      tokenContract={tokenContract}
      targetPanel={targetPanel}
      onCommit={isSellRoot ? setSellTokenContract : setBuyTokenContract}
      peerAddress={isSellRoot ? buyTokenContract?.address : sellTokenContract?.address}
    />
  );
}

function TokenSelectDropDownControlledMode(props: ControlledModeProps) {
  const { token, onCommit, targetPanel, peerAddress, ...rest } = props;
  return (
    <TokenSelectDropDownView
      {...rest}
      dataPanelRoot="controlled"
      openMethodSuffix="openTokenList"
      tokenContract={token}
      targetPanel={targetPanel ?? SP_COIN_DISPLAY.TOKEN_PANEL}
      onCommit={onCommit}
      peerAddress={peerAddress}
    />
  );
}

interface ViewProps extends CommonProps {
  dataPanelRoot: string;
  openMethodSuffix: string;
  tokenContract: TokenContract | undefined;
  targetPanel: SP_COIN_DISPLAY;
  onCommit: (token: TokenContract) => void;
  peerAddress?: string;
}

/**
 * Real, ExchangeContext-bound hook wiring (which tradeData field this
 * instance binds to, which detail panel its icon opens, the
 * openActiveListPanel call) feeding the portable, hook-free
 * TokenSelectDropDown from @sponsorcoin/spcoin-panels (promoted from
 * web-app-only glue 2026-09-18, on request — see that file's own header
 * comment). This file's whole job is now resolving real values and passing
 * them down, no rendering logic of its own left here.
 */
function TokenSelectDropDownView({
  dataPanelRoot,
  openMethodSuffix,
  tokenContract,
  targetPanel,
  onCommit,
  peerAddress,
  chevronPanelId,
  style,
  panelGateId,
  showDisplay,
  onSelectClick,
  onAddressClick,
  label = 'Select Token',
  addrPrePostSize = 4,
  showSymbol = false,
  showName = false,
  collapseKey,
  onExpandedChange,
  restrictRowClickToChevron = false,
  feedType = FEED_TYPE.REMOTE_TOKEN_LIST,
}: ViewProps) {
  const { openActiveListPanel } = useOpenActiveListPanel();

  const openTokenSelectPanel = useCallback(
    () => {
      clearFSMTraceFromMemory();
      debugLog.log?.(`[TokenSelectDropDown] ${openMethodSuffix}`);
      openActiveListPanel(
        {
          feedType,
          onCommit,
          peerAddress,
          selectOnLogoClick: true,
        },
        `TokenSelectDropDown:openTokenSelectPanel:${openMethodSuffix}`,
        SP_COIN_DISPLAY.REMOTE_TOKEN_LIST,
      );
    },
    [feedType, onCommit, peerAddress, openActiveListPanel, openMethodSuffix],
  );

  const handleSelectClick = useCallback(
    (e: React.SyntheticEvent) => {
      if (onSelectClick) {
        onSelectClick(e);
        return;
      }
      openTokenSelectPanel();
    },
    [onSelectClick, openTokenSelectPanel],
  );

  return (
    <PortableTokenSelectDropDown
      hasEntity={!!tokenContract}
      icon={
        tokenContract ? (
          <TokenLogo
            tokenContract={tokenContract}
            title={`TOKEN : ${tokenContract?.symbol ?? ''}: ${tokenContract?.name ?? ''}`}
            className="h-full w-full object-contain"
            targetPanel={targetPanel}
          />
        ) : undefined
      }
      symbol={tokenContract?.symbol}
      name={tokenContract?.name}
      address={tokenContract?.address ? String(tokenContract.address) : ''}
      label={label}
      onSelectClick={handleSelectClick}
      onAddressClick={onAddressClick}
      showChevron={chevronPanelId !== undefined}
      showDisplay={showDisplay}
      addrPrePostSize={addrPrePostSize}
      showSymbol={showSymbol}
      showName={showName}
      restrictRowClickToChevron={restrictRowClickToChevron}
      style={style}
      dataPanelRoot={dataPanelRoot}
      panelGateId={panelGateId}
      panelGate={PanelGate}
      collapseKey={collapseKey}
      onExpandedChange={onExpandedChange}
    />
  );
}
