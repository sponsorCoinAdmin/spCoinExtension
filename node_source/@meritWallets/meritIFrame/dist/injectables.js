/** The functions that have their own request in the protocol. */
export const WELL_KNOWN_FUNCTIONS = ['copyText', 'openUrl', 'close'];
/** The names of the host's other functions: the ones the wallet reaches through `call`. */
export function customFunctionNames(functions) {
    return Object.keys(functions ?? {}).filter((name) => !WELL_KNOWN_FUNCTIONS.includes(name) && name !== 'resize');
}
/**
 * The injectables a FRAMED wallet sees: the type and settings the parent sent, a stub for each custom function name (each calls the parent and resolves its answer), and the well-known stubs the wallet's bridge supplies.
 * `call` is how a stub reaches the parent; `wellKnown` are the copy, open and close stubs.
 */
export function buildInjectables(init, call, wellKnown = {}) {
    const functions = { ...wellKnown };
    for (const name of init.functionNames ?? []) {
        if (WELL_KNOWN_FUNCTIONS.includes(name))
            continue;
        functions[name] = async (...args) => (await call(name, args));
    }
    return { walletType: init.walletType, settings: init.settings ?? {}, functions };
}
/** The injectables with the wallet type set by a host shell: whatever type the caller passed is replaced (a shell is one Merit type). Pure. */
export function withWalletType(injectables, walletType) {
    return { ...(injectables ?? {}), walletType };
}
