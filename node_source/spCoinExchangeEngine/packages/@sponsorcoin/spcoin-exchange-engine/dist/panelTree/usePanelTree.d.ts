import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export declare function usePanelTree(): {
    activeMainOverlay: SP_COIN_DISPLAY | null;
    isVisible: (panel: SP_COIN_DISPLAY) => boolean;
    setPanelVisible: (panel: SP_COIN_DISPLAY, visible: boolean, hookName?: string) => void;
    setVisible: (panel: SP_COIN_DISPLAY, visible: boolean, hookName?: string) => void;
    isTokenScrollVisible: boolean;
    getPanelChildren: (panel: SP_COIN_DISPLAY) => SP_COIN_DISPLAY[];
    isOnDisplayStack: (panel: SP_COIN_DISPLAY) => boolean;
    isTopOfStack: (panel: SP_COIN_DISPLAY) => boolean;
    openPanel: (panel: SP_COIN_DISPLAY, invoker?: string, parent?: SP_COIN_DISPLAY) => void;
    closePanel: {
        (panel: SP_COIN_DISPLAY, invoker?: string, arg?: unknown): void;
        (invoker?: string, arg?: unknown): void;
    };
    dumpNavStack: (tag?: string) => void;
};
