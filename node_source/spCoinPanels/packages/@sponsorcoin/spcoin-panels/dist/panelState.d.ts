import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export type MeritOnlyPanelId = 'MERIT_REWARDS_SUMMARY' | 'MERIT_REWARDS_PENDING';
export type PanelId = SP_COIN_DISPLAY | MeritOnlyPanelId;
export type Listener = () => void;
declare class MeritPanelState {
    private state;
    private listeners;
    private pending;
    private scheduled;
    isVisible: (id: PanelId) => boolean;
    getSnapshot: (id: PanelId) => boolean;
    getAll: () => Map<PanelId, boolean>;
    setVisible: (id: PanelId, visible: boolean) => void;
    subscribe: (id: PanelId, listener: Listener) => (() => void);
    private queueEmit;
    private flushNow;
    private emitNow;
}
export declare const meritPanelState: MeritPanelState;
export {};
