import type {
  MeritWalletPasswordMode,
  ApplicationSyncMode,
  MeritWalletLocation,
  MeritExtensionChannel,
} from '@sponsorcoin/spcoin-panels';

const STORAGE_KEY = 'spcoin_merit_wallet_config';

const PASSWORD_MODES: readonly MeritWalletPasswordMode[] = [
  'appRequired',
  'firstApproved',
  'methodRequired',
  'persisted',
];

const SYNC_MODES: readonly ApplicationSyncMode[] = ['authorize', 'enable', 'disable'];

const LOCATIONS: readonly MeritWalletLocation[] = [
  'CENTER',
  'FIXED',
  'FLOATING',
  'SPLIT_PANE',
  'STICK_TO_TOP',
];

const EXTENSION_CHANNELS: readonly MeritExtensionChannel[] = ['test', 'prod'];

export interface MeritWalletConfigState {
  passwordMode: MeritWalletPasswordMode;
  mandatorySecurity: boolean;
  mandatoryApproval: boolean;
  syncMode: ApplicationSyncMode;
  location: MeritWalletLocation;
  showBackgroundPage: boolean;
  modalMode: boolean;
  extensionChannel: MeritExtensionChannel;
}

export const DEFAULT_CONFIG_STATE: MeritWalletConfigState = {
  passwordMode: 'appRequired',
  mandatorySecurity: false,
  mandatoryApproval: false,
  syncMode: 'enable',
  location: 'FIXED',
  showBackgroundPage: true,
  modalMode: false,
  extensionChannel: 'prod',
};

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitize(value: unknown): MeritWalletConfigState {
  const raw = (value ?? {}) as Partial<Record<keyof MeritWalletConfigState, unknown>>;
  return {
    passwordMode: pickEnum(raw.passwordMode, PASSWORD_MODES, DEFAULT_CONFIG_STATE.passwordMode),
    mandatorySecurity: pickBoolean(raw.mandatorySecurity, DEFAULT_CONFIG_STATE.mandatorySecurity),
    mandatoryApproval: pickBoolean(raw.mandatoryApproval, DEFAULT_CONFIG_STATE.mandatoryApproval),
    syncMode: pickEnum(raw.syncMode, SYNC_MODES, DEFAULT_CONFIG_STATE.syncMode),
    location: pickEnum(raw.location, LOCATIONS, DEFAULT_CONFIG_STATE.location),
    showBackgroundPage: pickBoolean(raw.showBackgroundPage, DEFAULT_CONFIG_STATE.showBackgroundPage),
    modalMode: pickBoolean(raw.modalMode, DEFAULT_CONFIG_STATE.modalMode),
    extensionChannel: pickEnum(raw.extensionChannel, EXTENSION_CHANNELS, DEFAULT_CONFIG_STATE.extensionChannel),
  };
}

export async function readMeritWalletConfigState(): Promise<MeritWalletConfigState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return sanitize(stored[STORAGE_KEY]);
}

export async function writeMeritWalletConfigState(
  patch: Partial<MeritWalletConfigState>,
): Promise<MeritWalletConfigState> {
  const next = sanitize({ ...(await readMeritWalletConfigState()), ...patch });
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export function passwordDescriptionFor(mode: MeritWalletPasswordMode): string {
  switch (mode) {
    case 'firstApproved':
      return 'Browse and use the wallet without unlocking up front. The first write that needs a signature asks for the password once — after that, every write for the rest of the session is approved without asking again.';
    case 'methodRequired':
      return 'The strictest mode — Merit Wallet locks behind a password every session, same as App, and on top of that every write still asks for its account’s password at that moment, every time.';
    case 'persisted':
      return 'Same as App, except the password is also stored encrypted so it survives a reload — a temporary bypass, not a hardened secret store: it protects against casually opening browser storage, not against anything that can already run code here.';
    case 'appRequired':
    default:
      return 'Merit Wallet locks behind a password every session — enter it once and every write for the rest of the session is approved without asking again.';
  }
}

export function syncDescriptionFor(mode: ApplicationSyncMode): string {
  switch (mode) {
    case 'authorize':
      return 'Sync runs, and every sync mint requires the login password every time — the same way "All Transaction Approval Required" forces regular writes.';
    case 'disable':
      return 'The whole cross-process sync layer is off — no background pushes, no cross-session/cross-tab updates. Real writes (swap/stake/sponsor/send) are unaffected.';
    case 'enable':
    default:
      return 'Sync runs using whatever password is already cached — it never prompts on its own. If nothing is cached yet, that sync cycle is silently skipped.';
  }
}

export function extensionDownloadPathFor(channel: MeritExtensionChannel): string {
  return channel === 'prod'
    ? '/spCoinExtension/spCoinExtension.zip'
    : '/spCoinExtension/spCoinExtension-testing.zip';
}
