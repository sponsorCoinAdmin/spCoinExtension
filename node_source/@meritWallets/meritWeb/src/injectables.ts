// File: src/injectables.ts
//
// 2026-11-25 (owner: one set of injectables, two ways to mount; docs/design/meritWalletDesign.txt section 11): the options a host injects into the wallet, and how they become what the wallet component takes. The SAME object works whether the host mounts meritWeb in its page or
// meritIFrame frames it (in a frame, meritIFrame hands the wallet this shape, with each host function standing in as a stub). This package knows nothing about frames: the shape is matched structurally, with no import. Pure: no imports.

/** A host function. Arguments and results are plain data when the wallet is framed. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HostFunction = (...args: any[]) => unknown;

export interface MeritWebInjectables {
  /** The Merit type to show (EXT, WEB_APP, WEB, ANDROID, IPHONE). Omitted or unknown: WEB. */
  walletType?: string;
  /** Plain-data settings (for example chains or display defaults), for the page to use. */
  settings?: Record<string, unknown>;
  /** Host functions by name. copyText(text), openUrl(url, { sameTab }) and close() are the ones the wallet's platform uses. */
  functions?: Record<string, HostFunction>;
}

/** What the wallet component takes, derived from the injectables. */
export interface MountPieces {
  walletType?: string;
  platform?: {
    copyText?: (text: string) => Promise<void>;
    openUrl?: (url: string, options?: { sameTab?: boolean }) => void;
  };
  onClose?: () => void;
}

/** Run a host function so that neither a throw nor a rejection can reach the wallet: the answer is always a promise. */
const run = (fn: HostFunction, ...args: unknown[]): Promise<unknown> => {
  try {
    return Promise.resolve(fn(...args));
  } catch (error) {
    return Promise.reject(error);
  }
};

export function mountPiecesFromInjectables(injectables: MeritWebInjectables | undefined): MountPieces {
  const functions = injectables?.functions ?? {};
  const has = (name: string) => Object.prototype.hasOwnProperty.call(functions, name) && typeof functions[name] === 'function';
  const pieces: MountPieces = {};
  if (injectables?.walletType) pieces.walletType = injectables.walletType;
  const platform: NonNullable<MountPieces['platform']> = {};
  if (has('copyText')) platform.copyText = async (text) => { await run(functions.copyText, text); };
  if (has('openUrl')) platform.openUrl = (url, options) => { void run(functions.openUrl, url, { sameTab: !!options?.sameTab }).catch(() => undefined); };
  if (platform.copyText || platform.openUrl) pieces.platform = platform;
  if (has('close')) pieces.onClose = () => { void run(functions.close).catch(() => undefined); };
  return pieces;
}

/**
 * The injectables a device package hands to the wallet: its own defaults (what the device does for copy, open and close) with the app's own functions and settings laid over them, and the device's Merit type set (the app cannot change the type of the device it runs on).
 * Pure: no imports.
 */
export function mergeInjectables(base: MeritWebInjectables, extra: Omit<MeritWebInjectables, 'walletType'> | undefined, walletType: string): MeritWebInjectables {
  return {
    walletType,
    settings: { ...(base.settings ?? {}), ...(extra?.settings ?? {}) },
    functions: { ...(base.functions ?? {}), ...(extra?.functions ?? {}) },
  };
}
