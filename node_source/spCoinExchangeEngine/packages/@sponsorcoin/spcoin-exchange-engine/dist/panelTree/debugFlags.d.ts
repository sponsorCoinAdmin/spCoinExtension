export interface DebugFlags {
    DEBUG_LOG_PANEL_TREE: boolean;
    DEBUG_LOG_OVERLAYS: boolean;
    DEBUG_LOG_OVERLAY_CLOSE: boolean;
    DEBUG_LOG_PANEL_CLOSE_INVARIANTS: boolean;
    DEBUG_LOG_PANEL_CLOSE_INVARIANTS_RENDER: boolean;
    DEBUG_LOG_PANEL_ACTIONS: boolean;
    DEBUG_LOG_PANEL_STACK: boolean;
    ALLOW_EMPTY_GLOBAL_OVERLAY: boolean;
    PRODUCTION_LOGGING: boolean;
    PERF_MARKS: boolean;
}
/** Live, mutable — read `flags.X` at the point of use, never cache the value. */
export declare const flags: Readonly<DebugFlags>;
/**
 * Called once by the consuming app's own bootstrap (e.g. the web app's
 * AppBootstrap.tsx), passing its real process.env.NEXT_PUBLIC_* reads.
 * Never called by the extension — every flag simply stays at its
 * already-correct-for-production default (false).
 */
export declare function configureDebugFlags(overrides: Partial<DebugFlags>): void;
