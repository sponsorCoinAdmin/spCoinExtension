// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/trade/tradeHost.tsx
//
// docs/design/spcoinPackagesDesign.txt 8.5.12 -- the trade engine's one host contract and its two shared pieces. The Swap tab and the Sponsor tab trade through the same path (the engine's useSwapFunctions over the host's registered executor); a host passes plain
// data and functions (TradeHost) and the component draws the confirm popup and the trade button. No host supplies a trade screen.
'use client';

import React from 'react';
import { SP_COIN_DISPLAY as SP } from '@sponsorcoin/spcoin-common/panels';
import { usePriceAPI } from '@sponsorcoin/spcoin-exchange-engine';
import { AccountAvatarWithOpen, ExchangeButtonController, StakeConfirmPopup, TradeButtonSlot } from '@sponsorcoin/spcoin-panels';

type PopupProps = React.ComponentProps<typeof StakeConfirmPopup>;
type ControllerProps = React.ComponentProps<typeof ExchangeButtonController>;
export type PopupSlotProps = Parameters<ControllerProps['renderConfirmPopup']>[0];

/** What the confirm popup needs from the host's own state; every field is optional. */
export interface StakeConfirmHostState {
  chainId?: PopupProps['chainId'];
  swapRouterAddress?: PopupProps['swapRouterAddress'];
  approvalRequest?: PopupProps['approvalRequest'];
  advanceReady?: PopupProps['advanceReady'];
  onAdvance?: PopupProps['onAdvance'];
  onResetAdvance?: PopupProps['onResetAdvance'];
  onTrace?: PopupProps['onTrace'];
  /** Called before the popup's own Cancel (the web app rejects a request still waiting for the decision). */
  onBeforeCancel?(): void;
}

/** What a host gives the trade screens: data and functions only. */
export interface TradeHost {
  /** The active trading provider (the web app's useApiProvider). */
  apiProvider?: string;
  trace?: (label: string, payload: unknown) => void;
  /** Open a recipient's site (the web app adds a header tab; the extension opens a browser tab). Default: the platform opens it. */
  onRecipientSiteClick?(href: string): void;
  /** A hook that reads the host's own state for the confirm popup. Must be a stable function. */
  useConfirmHost?(): StakeConfirmHostState;
}

export const noConfirmHost = (): StakeConfirmHostState => ({});

export function ConfirmPopup({ popupProps, useConfirmHost }: { popupProps: PopupSlotProps; useConfirmHost: () => StakeConfirmHostState }) {
  const { onBeforeCancel, ...state } = useConfirmHost();
  return (
    <StakeConfirmPopup
      {...popupProps}
      {...state}
      renderAccountAvatar={({ account, title, style }) => <AccountAvatarWithOpen account={account} title={title} style={style} />}
      onCancel={() => {
        onBeforeCancel?.();
        popupProps.onCancel();
      }}
    />
  );
}

/** The Swap tab's trade button: the shared ExchangeButtonController (balance check, approve -> swap -> stake flow, the confirm popup) on the engine's price state, gated by its own panel-tree flag. */
export function ConnectedTradeButton({ host }: { host?: TradeHost }) {
  const { isLoading } = usePriceAPI();
  const useConfirmHost = host?.useConfirmHost ?? noConfirmHost;
  return (
    <TradeButtonSlot panelId={SP.ZERO_X_TRADE_BUTTON}>
      <ExchangeButtonController isLoadingPrice={isLoading} renderConfirmPopup={(popupProps) => <ConfirmPopup popupProps={popupProps} useConfirmHost={useConfirmHost} />} />
    </TradeButtonSlot>
  );
}
