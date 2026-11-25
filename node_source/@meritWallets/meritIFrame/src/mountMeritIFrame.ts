// File: src/mountMeritIFrame.ts
//
// 2026-11-25 (owner: mount the wallet as either meritWeb or meritIFrame, using only one): the iframe mount. A host passes the SAME HostInjectables it would pass to meritWeb's mountMeritWeb; this puts the wallet page in a frame, injects the type and settings as data, and answers the wallet's requests
// with the host's functions (copyText, openUrl, close, and any other name through `call`). The wallet address may be relative (a wallet page bundled with the host) or absolute (a hosted one).
import { createWalletFrame } from './openStandaloneWallet';
import { connectWalletFrame, defaultFrameHandlers, type FrameHandlers, type WalletFrameConnection } from './parent';
import { customFunctionNames, type HostInjectables, type InjectedFunction, type Json } from './injectables';
import { embedUrl, type FrameMessage, type FrameWalletType } from './protocol';

export interface MountMeritIFrameOptions {
  /** Where the frame goes. */
  element: HTMLElement;
  /** The wallet page's address: absolute (https://sponsorcoin.org/) or relative to this page. */
  walletUrl: string;
  /** What the host injects: the same object meritWeb's mount takes. */
  injectables?: HostInjectables;
  /** Frame size (CSS). Default: fills its element. */
  width?: string;
  height?: string;
  /** Every accepted message and every answered request, for the host page's own log. */
  onMessage?: (message: FrameMessage) => void;
  onRequest?: (action: string, ok: boolean, error?: string) => void;
}

export interface MeritIFrameMount extends WalletFrameConnection {
  frame: HTMLIFrameElement;
}

export function mountMeritIFrame({ element, walletUrl, injectables = {}, width = '100%', height = '100%', onMessage, onRequest }: MountMeritIFrameOptions): MeritIFrameMount {
  const resolved = new URL(walletUrl, window.location.href);
  const functions = injectables.functions ?? {};
  const defaults = defaultFrameHandlers();
  const handlers: FrameHandlers = {
    copyText: functions.copyText ? async ({ text }) => { await (functions.copyText as InjectedFunction)(text); } : defaults.copyText,
    openUrl: functions.openUrl ? async ({ url, sameTab }) => { await (functions.openUrl as InjectedFunction)(url, { sameTab: !!sameTab } as Json); } : defaults.openUrl,
    close: async () => { if (functions.close) await functions.close(); },
  };
  const custom: Record<string, InjectedFunction> = {};
  for (const name of customFunctionNames(functions)) custom[name] = functions[name] as InjectedFunction;
  const handle = createWalletFrame({ url: embedUrl(resolved.toString()), parent: element, width, height });
  const connection = connectWalletFrame({
    frame: handle.frame,
    walletOrigin: resolved.origin,
    init: () => ({ walletType: ((injectables.walletType ?? 'WEB').toUpperCase().replace(' ', '_')) as FrameWalletType, settings: injectables.settings ?? {}, functionNames: Object.keys(custom) }),
    handlers,
    functions: custom,
    onMessage,
    onRequest,
  });
  return {
    frame: handle.frame,
    ready: connection.ready,
    dispose: () => { connection.dispose(); handle.dispose(); },
  };
}
