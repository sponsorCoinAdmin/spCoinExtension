// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/debugLogger.ts
//
// Copied verbatim from the parent app's lib/utils/debugLogger.ts
// (2026-09-18, panel-tree runtime migration) — zero external imports in
// the original (only `process.env`/`console`), genuinely portable as-is.
// Unlike lib/utils/debugTrace.ts (which writes to window.localStorage
// and stays web-app-local, routed through traceSink.ts instead), this
// file has no storage dependency to inject around.
//
// 2026-09-29, real fix — the one exception: `forceLogging` used to read
// process.env.NEXT_PUBLIC_PRODUCTION_LOGGING directly, a Next.js-specific
// build-time convention this portable file has no business assuming. Now
// reads the injectable debugFlags.ts instead — see that file's own header
// comment.
import { flags } from './debugFlags';
const LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
/**
 * BigInt-safe JSON.stringify helper
 */
function serializeWithBigInt(obj) {
    return JSON.stringify(obj, (_key, value) => {
        if (typeof value === 'bigint')
            return value.toString();
        const passthrough = value;
        return passthrough;
    });
}
/**
 * Creates a module-scoped debug logger.
 *
 * @param moduleName - Name of the module using the logger
 * @param enabled - Whether to emit debug output (default: false)
 * @param tsFlag - Whether to include timestamps (default: true)
 * @param logLevel - Minimum log level to output (default: 'debug')
 */
export function createDebugLogger(moduleName, enabled, tsFlag = true, logLevel = 'debug') {
    const prefix = `[🛠️ ${moduleName}]`;
    const logBuffer = [];
    const isProduction = process.env.NODE_ENV === 'production';
    const forceLogging = flags.PRODUCTION_LOGGING;
    const shouldLog = enabled && (!isProduction || forceLogging);
    const minLevel = LEVEL_PRIORITY[logLevel];
    if (shouldLog) {
        const msg = `${prefix} DebugLogging ON — level=${logLevel}, timestamp=${tsFlag}`;
        console.log(msg);
        logBuffer.push(msg);
    }
    function formatLine(type, args) {
        const ts = tsFlag ? `${new Date().toISOString()} ` : '';
        return `${ts}${prefix} ${type}: ${formatArgs(args)}`;
    }
    function formatArgs(args) {
        return args
            .map((arg) => {
            if (typeof arg === 'string' && arg.includes('=') && !arg.includes('{') && !arg.includes('[')) {
                const [key, value] = arg.split('=');
                const paddedKey = key.trim().padEnd(16);
                return `${paddedKey}= ${value.trim()}`;
            }
            return formatArg(arg);
        })
            .join(' ');
    }
    function formatArg(arg) {
        if (typeof arg === 'string')
            return arg;
        try {
            return serializeWithBigInt(arg);
        }
        catch {
            return '[Unserializable]';
        }
    }
    return {
        debug: (...args) => {
            if (shouldLog && minLevel <= LEVEL_PRIORITY.debug) {
                const line = formatLine('DEBUG', args);
                console.debug(line);
                logBuffer.push(line);
            }
        },
        log: (...args) => {
            if (shouldLog && minLevel <= LEVEL_PRIORITY.info) {
                const line = formatLine('LOG', args);
                console.log(line);
                logBuffer.push(line);
            }
        },
        warn: (...args) => {
            if (shouldLog && minLevel <= LEVEL_PRIORITY.warn) {
                const line = formatLine('WARN ⚠️', args);
                console.warn(line);
                logBuffer.push(line);
            }
        },
        error: (...args) => {
            if (shouldLog && minLevel <= LEVEL_PRIORITY.error) {
                const line = formatLine('ERROR ❌', args);
                console.error(line);
                logBuffer.push(line);
            }
        },
        dump: () => [...logBuffer],
        clear: () => {
            logBuffer.length = 0;
        },
    };
}
