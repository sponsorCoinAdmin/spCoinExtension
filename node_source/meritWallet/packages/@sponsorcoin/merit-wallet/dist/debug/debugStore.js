// File: src/debug/debugStore.ts
//
// 2026-11-14 (owner: "a universal bug display for both the extension and the app ... the exact same bug dump from any Merit Wallet anywhere, for an exact comparison of debugging data"):
// the ONE diagnostics store of the wallet. Every host and every shared component writes to it through the same few calls, and the ladybug panel (DebugBug.tsx) prints it in ONE fixed layout, so two dumps taken in two
// apps (web app on localhost, web app on sponsorcoin.org, the extension) can be compared line by line.
//
//   - log(who, what)                 a line in the event trace (a ring of the newest 300; noisy layout events are dropped)
//   - error(kind, text)              an error, with its stack when it has one (a ring of the newest 50), always kept
//   - setSection(name, provider)     a snapshot provider: a function the dump calls to read its current state (the host's chain / contract / account, the rewards panel's clock and estimate)
//   - buildDump()                    all of it as plain text, sections in a fixed order, keys sorted inside a section
// The dump never contains a password, a key or a recovery phrase: sections hold what the wallet DISPLAYS (addresses, amounts, times, flags), and `redact` removes any field whose name looks like a secret.
// This file holds no device access (it runs on the DOM, a phone, a test); the device facts, hotkey and error hooks come from the platform (platform.ts).
const MAX_LINES = 300;
const MAX_ERRORS = 50;
/** Events that fire many times a second and say nothing about a number: kept out of the trace so the useful lines stay on screen. */
const NOISE = /useStepPanel:(hide|hostMounted|hostUnmounted)|TradeButtonSlot:|useConfirmPopupFlow:|SellSelectPanelLayoutContainer:balance/;
const SECRET_KEY = /password|passphrase|mnemonic|phrase|private|secret|seed|keystore|totp|credential/i;
/** The fixed order of the dump; a section a host did not register is printed as "(not provided)" so the two dumps always have the same lines. */
export const DEBUG_SECTIONS = ['app', 'device', 'chain', 'clock', 'account', 'rewards', 'worker'];
const stamp = (ms) => new Date(ms).toISOString().slice(11, 23);
/** A copy of `value` with every secret-looking field removed, and bigint / error values turned into text. Cycles are cut. */
export function redact(value, depth = 0, seen = new WeakSet()) {
    if (typeof value === 'bigint')
        return value.toString();
    if (value instanceof Error)
        return `${value.name}: ${value.message}`;
    if (!value || typeof value !== 'object')
        return value;
    if (seen.has(value))
        return '(cycle)';
    if (depth > 6)
        return '(too deep)';
    seen.add(value);
    if (Array.isArray(value))
        return value.slice(0, 60).map((item) => redact(item, depth + 1, seen));
    const out = {};
    for (const key of Object.keys(value).sort()) {
        out[key] = SECRET_KEY.test(key) ? '(hidden)' : redact(value[key], depth + 1, seen);
    }
    return out;
}
export function createDebugStore(clock = () => Date.now()) {
    let lines = [];
    let errors = [];
    let enabled = false;
    let counter = 0;
    const sections = new Map();
    const listeners = new Set();
    const bump = () => {
        counter += 1;
        listeners.forEach((listener) => listener());
    };
    return {
        log(who, what) {
            if (NOISE.test(`${who}:${what}`) || NOISE.test(what))
                return;
            lines.push(`${stamp(clock())} ${who}: ${what}`);
            if (lines.length > MAX_LINES)
                lines = lines.slice(-MAX_LINES);
            bump();
        },
        error(kind, text) {
            errors.push(`${stamp(clock())} ${kind}: ${text}`);
            if (errors.length > MAX_ERRORS)
                errors = errors.slice(-MAX_ERRORS);
            bump();
        },
        setSection(name, provider) {
            if (provider)
                sections.set(name, provider);
            else
                sections.delete(name);
        },
        clear() {
            lines = [];
            errors = [];
            bump();
        },
        async buildDump(now = clock()) {
            const out = [];
            out.push('MERIT WALLET DEBUG DUMP v1');
            out.push(`dumpedAtUtc: ${new Date(now).toISOString()}`);
            // 2026-11-27 (owner): the build comes first, so a dump shows at a glance whether the latest release is running
            try {
                const app = await sections.get('app')?.();
                const build = app && typeof app === 'object' ? app.build : undefined;
                if (typeof build === 'string' && build)
                    out.push(`build: ${build}`);
            }
            catch {
                // the app section reports its own failure below
            }
            const names = [...DEBUG_SECTIONS, ...[...sections.keys()].filter((name) => !DEBUG_SECTIONS.includes(name)).sort()];
            for (const name of names) {
                out.push('', `## ${name}`);
                const provider = sections.get(name);
                if (!provider) {
                    out.push('(not provided)');
                    continue;
                }
                try {
                    const value = redact(await provider());
                    if (value && typeof value === 'object' && !Array.isArray(value)) {
                        for (const key of Object.keys(value)) {
                            const item = value[key];
                            out.push(`${key}: ${typeof item === 'string' ? item : JSON.stringify(item)}`);
                        }
                    }
                    else
                        out.push(typeof value === 'string' ? value : JSON.stringify(value));
                }
                catch (error) {
                    out.push(`(could not read: ${error instanceof Error ? error.message : String(error)})`);
                }
            }
            out.push('', `## errors (${errors.length})`, ...(errors.length ? errors : ['(none)']));
            out.push('', `## trace (${lines.length})`, ...(lines.length ? lines : ['(none)']));
            return out.join('\n');
        },
        version: () => counter,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        isEnabled: () => enabled,
        setEnabled(next) {
            if (enabled === next)
                return;
            enabled = next;
            bump();
        },
    };
}
/** An address with only its host kept: a node address often carries the account's access key in its path or query, and a dump is meant to be pasted into chats. */
export function hideAddressSecrets(address) {
    if (!address)
        return '(none)';
    try {
        const url = new URL(address);
        return `${url.protocol}//${url.host}${url.pathname.length > 1 || url.search ? '/(path hidden)' : ''}`;
    }
    catch {
        return '(unreadable address)';
    }
}
/** Registers the 'app' and 'chain' sections from one getter the host keeps current (read when the dump is built). */
export function registerHostDebug(store, info) {
    store.setSection('app', () => {
        const i = info();
        return { app: i.app, build: i.build ?? '(unknown)', server: /^https?:\/\//i.test(i.server ?? '') ? hideAddressSecrets(i.server) : (i.server ?? '(none)') };
    });
    store.setSection('chain', () => {
        const i = info();
        return { chainId: i.chainId ?? '(unknown)', rpcUrl: hideAddressSecrets(i.rpcUrl), contract: i.contract ?? '(none)' };
    });
}
/** The wallet's one store (a page has one wallet). Tests make their own with createDebugStore. */
export const meritDebug = createDebugStore();
