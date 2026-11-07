/** The part of a merit-connect side (SideConfig) this hook reads. */
export interface MeritLinkSource {
    link(): {
        connected: boolean;
    };
    subscribeLink(listener: () => void): () => void;
}
export declare function useMeritLink(source: MeritLinkSource): boolean;
