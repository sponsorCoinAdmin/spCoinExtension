import React from 'react';
import { ExchangeButtonController, StakeConfirmPopup } from '@sponsorcoin/spcoin-panels';
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
export declare const noConfirmHost: () => StakeConfirmHostState;
export declare function ConfirmPopup({ popupProps, useConfirmHost }: {
    popupProps: PopupSlotProps;
    useConfirmHost: () => StakeConfirmHostState;
}): React.JSX.Element;
/** The Swap tab's trade button: the shared ExchangeButtonController (balance check, approve -> swap -> stake flow, the confirm popup) on the engine's price state, gated by its own panel-tree flag. */
export declare function ConnectedTradeButton({ host }: {
    host?: TradeHost;
}): React.JSX.Element;
export {};
