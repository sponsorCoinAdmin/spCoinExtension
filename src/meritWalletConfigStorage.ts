// File: src/meritWalletConfigStorage.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt row 6): the config shape, defaults, validation and the descriptions under the options moved
// to @sponsorcoin/merit-wallet (walletConfig.ts), where the web app uses the same code. This file is now only what is extension-specific:
// reading and writing the config in chrome.storage.local. The re-exports keep sidepanel.ts's imports as they were.
import { sanitizeWalletConfig, type MeritWalletConfigState } from '@sponsorcoin/merit-wallet';

export {
  DEFAULT_WALLET_CONFIG,
  passwordDescriptionFor,
  syncDescriptionFor,
  extensionDownloadPathFor,
  type MeritWalletConfigState,
} from '@sponsorcoin/merit-wallet';

const STORAGE_KEY = 'spcoin_merit_wallet_config';

export async function readMeritWalletConfigState(): Promise<MeritWalletConfigState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return sanitizeWalletConfig(stored[STORAGE_KEY]);
}

export async function writeMeritWalletConfigState(
  patch: Partial<MeritWalletConfigState>,
): Promise<MeritWalletConfigState> {
  const next = sanitizeWalletConfig({ ...(await readMeritWalletConfigState()), ...patch });
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}
