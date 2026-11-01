export interface PeerState {
    /** Reachable and logged on. */
    connected: boolean;
}
/** What a host supplies for one peer. */
export interface PeerTransport {
    /** Ask the peer. true / false = its answer; undefined (or a throw) = no answer, the state stays as it is. */
    ask(): Promise<boolean | undefined>;
    /** Listen to the peer's own change events: call `refresh()` to ask again, or `set()` when the event itself says the answer. Returns how to stop listening. */
    listen?(api: {
        refresh(): void;
        set(connected: boolean): void;
    }): (() => void) | void;
    /** The host's way to hear that its window regained focus: call `onFocus` each time. Returns how to stop. Omitted: no focus checks. (The package touches no device itself: the host supplies this and `storage`.) */
    focus?(onFocus: () => void): (() => void) | void;
    /** The person disconnected (true) or connected (false) this peer: the host tells the other side, so a link is cut or made on BOTH sides (full duplex). */
    onChoice?(detached: boolean, at: number): void;
    /** Where the person's disconnect choice is kept across page loads. Omitted: the choice lasts only while the page lives. */
    storage?: {
        get(key: string): string | null;
        set(key: string, value: string): void;
        remove(key: string): void;
    };
}
export interface PeerConnection {
    get(): PeerState;
    /** The person disconnected this wallet: it reads NOT connected until `attach()`, whatever the peer answers (its login does not undo a choice). The choice is kept across page loads (it is the person's intent, not a fact about the peer: facts are always asked). */
    detach(): void;
    /** The person connected this wallet again. `force`: an explicit Connect click counts as the newest choice even when the flag already reads connected (so the other side, which may have missed an earlier one, follows). */
    attach(force?: boolean): void;
    /** Did the person disconnect it? */
    isDetached(): boolean;
    /** When (ms since 1970) the link was last cut or made, on EITHER side; 0 = never. */
    choiceAt(): number;
    /** The other side choice arrived: taken when newer than ours (last writer wins), and not sent back. */
    adopt(detached: boolean, at: number): void;
    subscribe(listener: () => void): () => void;
    /** Start the checks (first use only): one question now, then on focus and on the peer's events. Idempotent. */
    start(): void;
}
export declare function createPeerConnection(id: string, transport: PeerTransport): PeerConnection;
/** The states of the injected peers, by id; re-renders when any changes. Starts each peer's checks on first use. */
export declare function usePeerStates(peers: Record<string, PeerConnection> | undefined): Record<string, PeerState>;
