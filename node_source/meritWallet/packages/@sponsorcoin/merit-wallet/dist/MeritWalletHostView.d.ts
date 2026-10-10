import React from 'react';
import { type MeritWalletProps } from './MeritWallet';
import type { HostActions, HostConfig, HostData, HostLayout, HostLock, HostSelection, HostSlots, HostUiState } from './hostContract';
export interface MeritWalletHostSections {
    layout: HostLayout;
    uiState?: HostUiState;
    data?: HostData;
    selection?: HostSelection;
    actions?: HostActions;
    slots?: HostSlots;
    lock?: HostLock;
    config?: HostConfig;
}
/** The flat props the component takes, from a host's sections. Later sections win on a repeated key, but no key belongs to two sections. */
export declare function meritWalletPropsFromHost(host: MeritWalletHostSections): MeritWalletProps;
export default function MeritWalletHostView({ host }: {
    host: MeritWalletHostSections;
}): React.FunctionComponentElement<MeritWalletProps>;
