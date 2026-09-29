export interface DebugLogger {
    debug: (...args: any[]) => void;
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    dump: () => string[];
    clear: () => void;
}
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
/**
 * Creates a module-scoped debug logger.
 *
 * @param moduleName - Name of the module using the logger
 * @param enabled - Whether to emit debug output (default: false)
 * @param tsFlag - Whether to include timestamps (default: true)
 * @param logLevel - Minimum log level to output (default: 'debug')
 */
export declare function createDebugLogger(moduleName: string, enabled: boolean, tsFlag?: boolean, logLevel?: LogLevel): DebugLogger;
export {};
