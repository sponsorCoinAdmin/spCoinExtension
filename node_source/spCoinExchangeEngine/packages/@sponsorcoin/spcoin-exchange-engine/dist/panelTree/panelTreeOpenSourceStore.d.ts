import type { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
type Listener = () => void;
declare class PanelTreeOpenSourceStore {
    private fromPanelTree;
    private listeners;
    mark: (panel: SP_COIN_DISPLAY, isFromPanelTree: boolean) => void;
    isFromPanelTree: (panel: SP_COIN_DISPLAY) => boolean;
    subscribe: (listener: Listener) => () => void;
}
export declare const panelTreeOpenSourceStore: PanelTreeOpenSourceStore;
export declare function usePanelTreeOpenSource(panel: SP_COIN_DISPLAY): boolean;
export {};
