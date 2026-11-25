// File: src/protocol.ts
//
// 2026-11-24 (owner: the iframe wallet design, docs/design/meritWalletDesign.txt section 10): the messages between a PARENT page (any Merit type that embeds the wallet) and the embedded WALLET app (the standard stand-alone wallet, @meritWallets/meritBrowser).
// Only data crosses an iframe: no objects, functions or components. Every message is a small plain object tagged with the protocol name and version; the receiver checks the sender's window AND origin before it reads one.
//
// Step 1, the handshake:   wallet -> parent: hello      parent -> wallet: init (the injected data)      wallet -> parent: ready
// Step 2, the actions:     wallet -> parent: request { id, action, payload }      parent -> wallet: response { id, ok, error? }
//   The wallet ASKS; the parent decides. A request is checked (validateRequest) before any handler runs, and an action the parent has no handler for is refused.

export const FRAME_PROTOCOL = 'merit-frame';
export const FRAME_VERSION = 1;

/** The wallet types, as plain strings (the wallet package's MeritWalletType enum has the same values). The frame package does not import the wallet. */
export type FrameWalletType = 'EXT' | 'WEB_APP' | 'WEB' | 'ANDROID' | 'IPHONE';

/** Plain data: the only thing that crosses a frame. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** What the parent injects: data only. Functions the host provides are NOT sent: only their names (functionNames); the wallet gets a stub for each that asks the parent through the `call` action. */
export interface FrameInit {
  walletType: FrameWalletType;
  /** Plain-data settings the host injects (chains, display defaults, ...). */
  settings?: Record<string, Json>;
  /** The names of the host functions the wallet may call through `call` (never copyText, openUrl, close or resize: those have their own actions). */
  functionNames?: string[];
}

/** What the wallet may ask of its parent. */
export interface FrameActionPayloads {
  /** Put text on the clipboard (the parent's clipboard permission, not the frame's). */
  copyText: { text: string };
  /** Open an address: http(s) or mailto only. */
  openUrl: { url: string; sameTab?: boolean };
  /** The wallet wants to be closed (its close button). */
  close: Record<string, never>;
  /** The wallet wants the frame to be this big (px). */
  resize: { width?: number; height?: number };
  /** The wallet calls a function the host registered, by name, with plain-data arguments. The answer (plain data) comes back in the response. */
  call: { name: string; args: Json[] };
}
export type FrameAction = keyof FrameActionPayloads;
export const FRAME_ACTIONS: readonly FrameAction[] = ['copyText', 'openUrl', 'close', 'resize', 'call'];

interface Envelope {
  protocol: typeof FRAME_PROTOCOL;
  version: number;
}

export type ChildMessage =
  | (Envelope & { kind: 'hello' })
  | (Envelope & { kind: 'ready' })
  | (Envelope & { kind: 'request'; id: number; action: string; payload: unknown });
export type ParentMessage =
  | (Envelope & { kind: 'init'; init: FrameInit })
  | (Envelope & { kind: 'response'; id: number; ok: boolean; error?: string; result?: Json });
export type FrameMessage = ChildMessage | ParentMessage;

export function frameMessage<T extends { kind: string }>(body: T): Envelope & T {
  return { protocol: FRAME_PROTOCOL, version: FRAME_VERSION, ...body };
}

/** True when `data` is one of this protocol's messages (the shape only; the caller has already checked who sent it). */
export function isFrameMessage(data: unknown): data is FrameMessage {
  const d = data as Partial<Envelope & { kind: string }> | null;
  return !!d && typeof d === 'object' && d.protocol === FRAME_PROTOCOL && d.version === FRAME_VERSION && typeof d.kind === 'string';
}

/** The page address of the wallet in embedded mode: the same app, asked to wait for its parent. */
export function embedUrl(url: string): string {
  const u = new URL(url);
  u.searchParams.set('embed', '1');
  return u.toString();
}

const MAX_COPY_CHARS = 10_000;
const MIN_SIZE = 200;
const MAX_SIZE = 4_000;
const URL_SCHEMES = ['http:', 'https:', 'mailto:'];
/** A host function's name: letters, digits and underscores, starting with a letter. The four actions that have their own request are not callable by name. */
export const CALL_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
export const RESERVED_CALL_NAMES: readonly string[] = ['copyText', 'openUrl', 'close', 'resize'];
export const MAX_CALL_ARGS = 16;
export const MAX_CALL_JSON = 100_000;

/** Is this request one the parent may act on? Returns the reason it is not, or undefined when it is fine. Pure: the same checks run in the parent and in the tests. */
export function validateRequest(action: string, payload: unknown): string | undefined {
  if (!(FRAME_ACTIONS as readonly string[]).includes(action)) return `unknown action: ${action}`;
  const p = (payload ?? {}) as Record<string, unknown>;
  if (action === 'copyText') {
    if (typeof p.text !== 'string') return 'copyText needs text';
    if (p.text.length > MAX_COPY_CHARS) return `copyText is limited to ${MAX_COPY_CHARS} characters`;
  }
  if (action === 'openUrl') {
    if (typeof p.url !== 'string') return 'openUrl needs a url';
    let parsed: URL;
    try { parsed = new URL(p.url); } catch { return 'openUrl: not a valid address'; }
    if (!URL_SCHEMES.includes(parsed.protocol)) return `openUrl: ${parsed.protocol} addresses are not allowed`;
  }
  if (action === 'call') {
    if (typeof p.name !== 'string' || !CALL_NAME.test(p.name)) return 'call needs a function name (letters, digits, underscores)';
    if (RESERVED_CALL_NAMES.includes(p.name)) return `call: ${p.name} has its own request`;
    if (!Array.isArray(p.args)) return 'call needs an args list';
    if (p.args.length > MAX_CALL_ARGS) return `call is limited to ${MAX_CALL_ARGS} arguments`;
    let size = 0;
    try { size = JSON.stringify(p.args).length; } catch { return 'call: the arguments are not plain data'; }
    if (size > MAX_CALL_JSON) return `call: the arguments are limited to ${MAX_CALL_JSON} characters`;
  }
  if (action === 'resize') {
    for (const key of ['width', 'height'] as const) {
      const v = p[key];
      if (v === undefined) continue;
      if (typeof v !== 'number' || !Number.isFinite(v) || v < MIN_SIZE || v > MAX_SIZE) return `resize: ${key} must be a number from ${MIN_SIZE} to ${MAX_SIZE}`;
    }
    if (p.width === undefined && p.height === undefined) return 'resize needs a width or a height';
  }
  return undefined;
}
