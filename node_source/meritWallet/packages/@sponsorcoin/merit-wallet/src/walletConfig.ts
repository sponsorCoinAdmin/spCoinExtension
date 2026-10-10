// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/walletConfig.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt row 6, S2b-3) -- the wallet's Config state and its change handling, written once for
// both hosts. Before this, the web app (lib/spCoinWallet/useMeritWalletConfig.tsx) and the extension (src/meritWalletConfigStorage.ts plus
// sidepanel.ts) each kept their own copy of the same things: the config shape and defaults, the descriptions shown under the password and
// sync options, and "set a value, persist it, run the side effects, tell the host". The text below is the WEB app's, verbatim (the web
// app is the reference); the extension's copies had drifted (for example the "App" description lacked its last sentence).
//
// What stays in each host, passed in through the adapter: where the config is stored (the web app's localStorage record, the extension's
// chrome.storage), and the side effects of a change (the web app clears or persists the cached wallet password and announces the change
// on a window event; the extension needs neither). The engine toggles (Uniswap / 0x) are not here: they change panel visibility, which is
// host wiring (the web app's useExchangeEngineSync, the extension's MeritWalletConfigBridge).
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  MeritWalletPasswordMode,
  ApplicationSyncMode,
  MeritWalletLocation,
  MeritExtensionChannel,
} from '@sponsorcoin/spcoin-panels';

export interface MeritWalletConfigState {
  passwordMode: MeritWalletPasswordMode;
  mandatorySecurity: boolean;
  mandatoryApproval: boolean;
  syncMode: ApplicationSyncMode;
  location: MeritWalletLocation;
  showBackgroundPage: boolean;
  modalMode: boolean;
  extensionChannel: MeritExtensionChannel;
  /** How long a persisted password stays valid without being used, in hours (minimum 1 minute, maximum 24 hours). */
  persistedPasswordTimeoutHours: number;
}

/** The defaults the web app starts a fresh wallet with (components/wallet/lib/meritWalletStorage.ts DEFAULT_MERIT_WALLET_LS.config). */
export const DEFAULT_WALLET_CONFIG: MeritWalletConfigState = {
  passwordMode: 'appRequired',
  mandatorySecurity: false,
  mandatoryApproval: false,
  syncMode: 'enable',
  location: 'FIXED',
  showBackgroundPage: true,
  modalMode: false,
  extensionChannel: 'prod',
  persistedPasswordTimeoutHours: 1,
};

const PASSWORD_MODES: readonly MeritWalletPasswordMode[] = ['appRequired', 'firstApproved', 'methodRequired', 'persisted'];
const SYNC_MODES: readonly ApplicationSyncMode[] = ['authorize', 'enable', 'disable'];
const LOCATIONS: readonly MeritWalletLocation[] = ['CENTER', 'FIXED', 'FLOATING', 'SPLIT_PANE', 'STICK_TO_TOP'];
const EXTENSION_CHANNELS: readonly MeritExtensionChannel[] = ['test', 'prod'];

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
function pickHours(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(24, Math.max(1 / 60, n)) : fallback;
}

/** Turns whatever a host read from storage into a valid config (unknown or missing fields fall back to the defaults). */
export function sanitizeWalletConfig(value: unknown): MeritWalletConfigState {
  const raw = (value ?? {}) as Partial<Record<keyof MeritWalletConfigState, unknown>>;
  const d = DEFAULT_WALLET_CONFIG;
  return {
    passwordMode: pickEnum(raw.passwordMode, PASSWORD_MODES, d.passwordMode),
    mandatorySecurity: pickBoolean(raw.mandatorySecurity, d.mandatorySecurity),
    mandatoryApproval: pickBoolean(raw.mandatoryApproval, d.mandatoryApproval),
    syncMode: pickEnum(raw.syncMode, SYNC_MODES, d.syncMode),
    location: pickEnum(raw.location, LOCATIONS, d.location),
    showBackgroundPage: pickBoolean(raw.showBackgroundPage, d.showBackgroundPage),
    modalMode: pickBoolean(raw.modalMode, d.modalMode),
    extensionChannel: pickEnum(raw.extensionChannel, EXTENSION_CHANNELS, d.extensionChannel),
    persistedPasswordTimeoutHours: pickHours(raw.persistedPasswordTimeoutHours, d.persistedPasswordTimeoutHours),
  };
}

// Descriptions shown under the options. Text copied verbatim from lib/spCoinWallet/useMeritWalletConfig.tsx (the web app).
export function passwordDescriptionFor(mode: MeritWalletPasswordMode): string {
  switch (mode) {
    case 'appRequired':
      return "Merit Wallet locks behind a password every session — enter it once and every write for the rest of the session is approved without asking again. The current default.";
    case 'firstApproved':
      return "Browse and use the wallet without unlocking up front. The first write that needs a signature asks for the password once — after that, every write for the rest of the session is approved without asking again.";
    case 'methodRequired':
      return "The strictest mode — Merit Wallet locks behind a password every session, same as App, and on top of that every write still asks for its account’s password at that moment, every time.";
    case 'persisted':
    default:
      // Same fall-through as the web app's original chain of ternaries: anything that is not one of the three above reads as "persisted".
      return "Same as App, except the password is also stored encrypted so it survives a reload — a temporary bypass, not a hardened secret store: it protects against casually opening browser storage, not against anything that can already run code on this page. The timer above resets to the full duration every time the password is actually used, so an actively-used session effectively never expires; an idle one does.";
  }
}

export function syncDescriptionFor(mode: ApplicationSyncMode): string {
  switch (mode) {
    case 'authorize':
      return "Sync runs, and every sync mint requires the login password every time — the same way \"All Transaction Approval Required\" forces regular writes.";
    case 'enable':
      return "Sync runs using whatever password is already cached — it never prompts on its own. If nothing is cached yet, that sync cycle is silently skipped.";
    case 'disable':
    default:
      return "The whole cross-process sync layer is off — no background pushes, no cross-session/cross-tab updates. Real writes (swap/stake/sponsor/send) are unaffected.";
  }
}

export function extensionDownloadPathFor(channel: MeritExtensionChannel): string {
  return channel === 'prod' ? '/spCoinExtension/spCoinExtension.zip' : '/spCoinExtension/spCoinExtension-testing.zip';
}

export interface WalletConfigAdapter {
  /** The persisted config right now. */
  read: () => MeritWalletConfigState;
  /** Persist a change. May be async; the controller does not wait for it (the in-memory state updates first). */
  write: (patch: Partial<MeritWalletConfigState>) => void | Promise<void>;
  /** Host side effects of a change, run after the write (the web app's password-cache handling and window event). */
  onChange?: (patch: Partial<MeritWalletConfigState>, next: MeritWalletConfigState) => void;
}

export interface WalletConfigController {
  getState: () => MeritWalletConfigState;
  /** Apply a change: update state, persist it, run the host's side effects, then notify. */
  set: (patch: Partial<MeritWalletConfigState>) => void;
  /** Re-read the persisted config (e.g. after another tab changed it) and notify. */
  reload: () => void;
}

/** Framework-free config controller. onChange fires after every state change (the host re-renders from getState()). */
export function createWalletConfig(adapter: WalletConfigAdapter, onChange: () => void = () => undefined): WalletConfigController {
  let state = adapter.read();
  return {
    getState: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
      void adapter.write(patch);
      adapter.onChange?.(patch, state);
      onChange();
    },
    reload: () => {
      state = adapter.read();
      onChange();
    },
  };
}

/** React form for component hosts. The adapter is read through a ref, so it may be a new object on every render. */
export function useWalletConfig(adapter: WalletConfigAdapter): { state: MeritWalletConfigState; set: (patch: Partial<MeritWalletConfigState>) => void } {
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;
  const controllerRef = useRef<WalletConfigController | null>(null);
  const [state, setState] = useState<MeritWalletConfigState>(() => adapter.read());
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  if (!controllerRef.current) {
    controllerRef.current = createWalletConfig(
      {
        read: () => adapterRef.current.read(),
        write: (patch) => adapterRef.current.write(patch),
        onChange: (patch, next) => adapterRef.current.onChange?.(patch, next),
      },
      () => {
        if (mountedRef.current && controllerRef.current) setState(controllerRef.current.getState());
      },
    );
  }
  const set = useCallback((patch: Partial<MeritWalletConfigState>) => controllerRef.current!.set(patch), []);
  return { state, set };
}
