// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/trade/tradeHost.tsx
//
// docs/design/spcoinPackagesDesign.txt 8.5.12 -- the trade engine's one host contract and its two shared pieces. The Swap tab and the Sponsor tab trade through the same path (the engine's useSwapFunctions over the host's registered executor); a host passes plain
// data and functions (TradeHost) and the component draws the confirm popup and the trade button. No host supplies a trade screen.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { SP_COIN_DISPLAY as SP } from '@sponsorcoin/spcoin-common/panels';
import { usePriceAPI } from '@sponsorcoin/spcoin-exchange-engine';
import { AccountAvatarWithOpen, ExchangeButtonController, StakeConfirmPopup, TradeButtonSlot } from '@sponsorcoin/spcoin-panels';
export const noConfirmHost = () => ({});
export function ConfirmPopup({ popupProps, useConfirmHost }) {
    const { onBeforeCancel, ...state } = useConfirmHost();
    return (_jsx(StakeConfirmPopup, { ...popupProps, ...state, renderAccountAvatar: ({ account, title, style }) => _jsx(AccountAvatarWithOpen, { account: account, title: title, style: style }), onCancel: () => {
            onBeforeCancel?.();
            popupProps.onCancel();
        } }));
}
/** The Swap tab's trade button: the shared ExchangeButtonController (balance check, approve -> swap -> stake flow, the confirm popup) on the engine's price state, gated by its own panel-tree flag. */
export function ConnectedTradeButton({ host }) {
    const { isLoading } = usePriceAPI();
    const useConfirmHost = host?.useConfirmHost ?? noConfirmHost;
    return (_jsx(TradeButtonSlot, { panelId: SP.ZERO_X_TRADE_BUTTON, children: _jsx(ExchangeButtonController, { isLoadingPrice: isLoading, renderConfirmPopup: (popupProps) => _jsx(ConfirmPopup, { popupProps: popupProps, useConfirmHost: useConfirmHost }) }) }));
}
