import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export declare const LOG_TIME = false;
export declare const DEBUG_ENABLED: boolean;
export declare const debugLog: import("./debugLogger").DebugLogger;
export declare const schedule: (fn: () => void, label?: string) => void | NodeJS.Timeout;
export declare function logAction(kind: 'openPanel' | 'closePanel', panel: SP_COIN_DISPLAY, invoker?: string, extra?: Record<string, unknown>): void;
