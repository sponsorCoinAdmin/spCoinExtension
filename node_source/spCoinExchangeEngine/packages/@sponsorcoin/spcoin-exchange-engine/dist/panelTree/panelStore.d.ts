import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export type PanelId = SP_COIN_DISPLAY;
export type Listener = () => void;
declare class PanelStore {
    private state;
    private listeners;
    private pending;
    private scheduled;
    isVisible: (id: PanelId) => boolean;
    getPanelSnapshot: (id: PanelId) => boolean;
    getAll: () => Map<PanelId, boolean>;
    setVisible: (id: PanelId, visible: boolean, source?: string) => void;
    subscribePanel: (id: PanelId, listener: Listener) => () => void;
    private queueEmit;
    private flushNow;
    private emitNow;
}
export declare const panelStore: PanelStore;
export {};
