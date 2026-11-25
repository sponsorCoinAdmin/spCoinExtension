// File: src/injectables.ts
//
// 2026-11-25 (owner: one set of injectables, two ways to mount; docs/design/meritWalletDesign.txt section 11): the ONE options shape a host passes, whether it mounts the wallet in its page (meritWeb) or in a frame (meritIFrame).
// Plain data (walletType, settings) crosses a frame as data. A FUNCTION cannot cross a frame, so in a frame each host function becomes a stub that asks the parent over the `call` action and awaits the answer; the wallet cannot tell the difference.
// Pure: only type imports (erased), so the tests run this file on its own.
import type { Json, FrameInit } from './protocol';

export type { Json } from './protocol';

/** A function the host provides. Arguments and the result are plain data (a result of nothing is allowed). */
export type InjectedFunction = (...args: Json[]) => Json | void | Promise<Json | void>;

/** What a host injects into the wallet, the same object for either mount. */
export interface HostInjectables {
  /** The Merit type to show (EXT, WEB_APP, WEB, ANDROID, IPHONE). Omitted: WEB. */
  walletType?: string;
  /** Plain-data settings (for example chains or display defaults). */
  settings?: Record<string, Json>;
  /** Host functions by name. copyText(text), openUrl(url, { sameTab }) and close() are the ones the wallet's platform uses; any other name is called through `call`. */
  functions?: Record<string, InjectedFunction>;
}

/** The functions that have their own request in the protocol. */
export const WELL_KNOWN_FUNCTIONS = ['copyText', 'openUrl', 'close'] as const;

/** The names of the host's other functions: the ones the wallet reaches through `call`. */
export function customFunctionNames(functions: Record<string, unknown> | undefined): string[] {
  return Object.keys(functions ?? {}).filter((name) => !(WELL_KNOWN_FUNCTIONS as readonly string[]).includes(name) && name !== 'resize');
}

/**
 * The injectables a FRAMED wallet sees: the type and settings the parent sent, a stub for each custom function name (each calls the parent and resolves its answer), and the well-known stubs the wallet's bridge supplies.
 * `call` is how a stub reaches the parent; `wellKnown` are the copy, open and close stubs.
 */
export function buildInjectables(
  init: Pick<FrameInit, 'walletType' | 'settings' | 'functionNames'>,
  call: (name: string, args: Json[]) => Promise<Json | undefined>,
  wellKnown: Partial<Record<(typeof WELL_KNOWN_FUNCTIONS)[number], InjectedFunction>> = {},
): HostInjectables {
  const functions: Record<string, InjectedFunction> = { ...wellKnown };
  for (const name of init.functionNames ?? []) {
    if ((WELL_KNOWN_FUNCTIONS as readonly string[]).includes(name)) continue;
    functions[name] = async (...args: Json[]) => (await call(name, args)) as Json;
  }
  return { walletType: init.walletType, settings: init.settings ?? {}, functions };
}
