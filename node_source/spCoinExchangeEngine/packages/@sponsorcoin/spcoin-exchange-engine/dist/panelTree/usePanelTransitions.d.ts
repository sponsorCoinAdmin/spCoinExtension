import type { MouseEventHandler } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
interface OpenOpts {
    methodName?: string;
}
type ClickOpts = OpenOpts & {
    preventDefault?: boolean;
    stopPropagation?: boolean;
    defer?: boolean;
};
export declare function usePanelTransitions(): {
    openOverlay: (panel: SP_COIN_DISPLAY, opts?: OpenOpts) => void;
    closeTop: (invoker?: string, arg?: unknown) => void;
    openOverlayClick: <T extends HTMLElement>(panel: SP_COIN_DISPLAY, opts?: ClickOpts) => MouseEventHandler<T>;
    closeTopClick: <T extends HTMLElement>(opts?: ClickOpts & {
        invoker?: string;
        arg?: unknown;
    }) => MouseEventHandler<T>;
};
export {};
