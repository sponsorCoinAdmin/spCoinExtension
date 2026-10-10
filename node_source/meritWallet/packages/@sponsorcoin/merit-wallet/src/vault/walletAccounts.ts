// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/vault/walletAccounts.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E2) -- the accounts the vault holds, the MetaMask way: one HD keyring made from a Secret Recovery
// Phrase (SRP), accounts derived from it at m/44'/60'/0'/0/<index>, plus accounts imported by private key. MetaMask rules kept: derived accounts
// cannot be removed (only imported ones can), the SRP is shown only behind the password, and nothing secret ever leaves this module except through
// getSigningAccount (used inside the host that owns the vault, never sent to a UI page).
//
// Built on viem (the extension forbids ethers). The vault session (vaultSession.ts) is the only storage: everything here reads and updates the
// decrypted contents while the wallet is unlocked.
//
// Dev accounts: MetaMask has no auto-seeding; the Hardhat accounts are IMPORTED (the well-known mnemonic or its keys). Anything made from them
// is flagged devOrigin, which the signer step uses to refuse them on any chain except 31337 (their keys are public).
import { english, generateMnemonic, mnemonicToAccount, privateKeyToAccount, type HDAccount, type PrivateKeyAccount } from 'viem/accounts';
import { VaultLockedError, VaultSession } from './vaultSession';

export type WalletAccountSource = 'generated' | 'imported';

export interface HdKeyring {
  mnemonic: string;
  /** How many accounts are derived so far (indexes 0 .. count-1). */
  count: number;
  devOrigin?: boolean;
}

export interface ImportedKey {
  privateKey: `0x${string}`;
  address: `0x${string}`;
  devOrigin?: boolean;
}

export interface WalletVaultContents {
  version: 1;
  hd?: HdKeyring;
  imported: ImportedKey[];
  /** Display names, by lower-case address. */
  names: Record<string, string>;
  /** Lower-case address of the active account, if one was chosen. */
  active?: string;
}

export interface WalletAccountRecord {
  address: `0x${string}`;
  name: string;
  source: WalletAccountSource;
  devOrigin: boolean;
  /** Derivation index for a generated account. */
  index?: number;
}

export class WalletAccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletAccountError';
  }
}

export const HARDHAT_DEV_MNEMONIC = 'test test test test test test test test test test test junk';

export function emptyWalletContents(): WalletVaultContents {
  return { version: 1, imported: [], names: {} };
}

const lower = (a: string) => a.toLowerCase();

// ---- BIP39 validation (viem's mnemonicToAccount does not check the checksum) ---------------------------------------------------------

const WORDLIST: readonly string[] = english;
const WORD_INDEX = new Map(WORDLIST.map((w, i) => [w, i] as const));

/** Normalise: trim, lower-case, single spaces. */
export function normalizeMnemonic(mnemonic: string): string {
  return String(mnemonic ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean).join(' ');
}

/** BIP39 check: 12, 15, 18, 21 or 24 English words, each in the list, with a valid checksum. */
export async function isValidMnemonic(mnemonic: string): Promise<boolean> {
  const words = normalizeMnemonic(mnemonic).split(' ').filter(Boolean);
  if (![12, 15, 18, 21, 24].includes(words.length)) return false;
  const indexes: number[] = [];
  for (const w of words) {
    const i = WORD_INDEX.get(w);
    if (i === undefined) return false;
    indexes.push(i);
  }
  const totalBits = words.length * 11;
  const checksumBits = totalBits / 33;
  const entropyBits = totalBits - checksumBits;
  const bits = indexes.map((i) => i.toString(2).padStart(11, '0')).join('');
  const entropy = new Uint8Array(entropyBits / 8);
  for (let i = 0; i < entropy.length; i++) entropy[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', entropy as BufferSource));
  const hashBits = Array.from(hash).map((b) => b.toString(2).padStart(8, '0')).join('');
  return hashBits.slice(0, checksumBits) === bits.slice(entropyBits);
}

function deriveAddress(mnemonic: string, index: number): `0x${string}` {
  return mnemonicToAccount(mnemonic, { addressIndex: index }).address;
}

const HARDHAT_DEV_ADDRESSES: Set<string> = (() => {
  const s = new Set<string>();
  for (let i = 0; i < 20; i++) s.add(lower(deriveAddress(HARDHAT_DEV_MNEMONIC, i)));
  return s;
})();

/** Is this one of Hardhat's 20 published dev addresses (their keys are public, so they must never sign on a real chain)? */
export function isHardhatDevAddress(address: string): boolean {
  return HARDHAT_DEV_ADDRESSES.has(lower(address));
}

// ---- wallet setup --------------------------------------------------------------------------------------------------------------------

/**
 * Set the wallet up: a new Secret Recovery Phrase (or the one given, to import a wallet), the first account derived, the vault created under
 * `password` and left unlocked. Returns the phrase so the UI can show it ONCE for backup: it is not returned by anything else; reveal it
 * later only through WalletAccounts.revealMnemonic (which asks for the password again).
 */
export async function createWallet(
  session: VaultSession<WalletVaultContents>,
  password: string,
  options: { mnemonic?: string } = {},
): Promise<{ address: `0x${string}`; mnemonic: string }> {
  let mnemonic: string;
  if (options.mnemonic !== undefined) {
    mnemonic = normalizeMnemonic(options.mnemonic);
    if (!(await isValidMnemonic(mnemonic))) throw new WalletAccountError('That Secret Recovery Phrase is not valid.');
  } else {
    mnemonic = generateMnemonic(english);
  }
  const devOrigin = mnemonic === HARDHAT_DEV_MNEMONIC;
  const address = deriveAddress(mnemonic, 0);
  const contents: WalletVaultContents = {
    version: 1,
    hd: { mnemonic, count: 1, ...(devOrigin ? { devOrigin: true } : {}) },
    imported: [],
    names: { [lower(address)]: 'Account 1' },
    active: lower(address),
  };
  await session.create(password, contents);
  return { address, mnemonic };
}

// ---- the accounts of an unlocked vault -----------------------------------------------------------------------------------------------

export class WalletAccounts {
  constructor(private readonly session: VaultSession<WalletVaultContents>) {}

  private contents(): WalletVaultContents {
    if (!this.session.isUnlocked()) throw new VaultLockedError();
    return this.session.getData();
  }

  list(): WalletAccountRecord[] {
    const c = this.contents();
    const out: WalletAccountRecord[] = [];
    if (c.hd) {
      for (let i = 0; i < c.hd.count; i++) {
        const address = deriveAddress(c.hd.mnemonic, i);
        out.push({ address, name: c.names[lower(address)] ?? `Account ${i + 1}`, source: 'generated', devOrigin: !!c.hd.devOrigin || isHardhatDevAddress(address), index: i });
      }
    }
    for (const k of c.imported) {
      out.push({ address: k.address, name: c.names[lower(k.address)] ?? 'Imported account', source: 'imported', devOrigin: !!k.devOrigin || isHardhatDevAddress(k.address) });
    }
    return out;
  }

  activeAddress(): `0x${string}` | undefined {
    const c = this.contents();
    const all = this.list();
    return all.find((a) => lower(a.address) === c.active)?.address ?? all[0]?.address;
  }

  async setActive(address: string): Promise<void> {
    if (!this.list().some((a) => lower(a.address) === lower(address))) throw new WalletAccountError('That account is not in this wallet.');
    await this.session.update((c) => ({ ...c, active: lower(address) }));
  }

  /** Derive the next account from the Secret Recovery Phrase. */
  async addDerived(name?: string): Promise<WalletAccountRecord> {
    const c = this.contents();
    if (!c.hd) throw new WalletAccountError('This wallet has no Secret Recovery Phrase to derive from.');
    const index = c.hd.count;
    const address = deriveAddress(c.hd.mnemonic, index);
    await this.session.update((cur) => ({
      ...cur,
      hd: { ...(cur.hd as HdKeyring), count: index + 1 },
      names: { ...cur.names, [lower(address)]: name?.trim() || `Account ${index + 1}` },
    }));
    return this.list().find((a) => lower(a.address) === lower(address)) as WalletAccountRecord;
  }

  /** Import an account by private key. A key whose address is already in the wallet is refused. */
  async importPrivateKey(privateKey: string, name?: string): Promise<WalletAccountRecord> {
    const key = String(privateKey ?? '').trim();
    const normalized = (key.startsWith('0x') ? key : `0x${key}`) as `0x${string}`;
    if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) throw new WalletAccountError('A private key is 64 hexadecimal characters.');
    const address = privateKeyToAccount(normalized).address;
    if (this.list().some((a) => lower(a.address) === lower(address))) throw new WalletAccountError('That account is already in this wallet.');
    await this.session.update((cur) => ({
      ...cur,
      imported: [...cur.imported, { privateKey: normalized, address, ...(isHardhatDevAddress(address) ? { devOrigin: true } : {}) }],
      names: { ...cur.names, [lower(address)]: name?.trim() || 'Imported account' },
    }));
    return this.list().find((a) => lower(a.address) === lower(address)) as WalletAccountRecord;
  }

  /** Remove an imported account. Derived accounts cannot be removed (they come back from the Secret Recovery Phrase), as in MetaMask. */
  async remove(address: string): Promise<void> {
    const record = this.list().find((a) => lower(a.address) === lower(address));
    if (!record) throw new WalletAccountError('That account is not in this wallet.');
    if (record.source !== 'imported') throw new WalletAccountError('Accounts made from the Secret Recovery Phrase cannot be removed.');
    await this.session.update((cur) => {
      const names = { ...cur.names };
      delete names[lower(address)];
      return { ...cur, imported: cur.imported.filter((k) => lower(k.address) !== lower(address)), names, active: cur.active === lower(address) ? undefined : cur.active };
    });
  }

  async rename(address: string, name: string): Promise<void> {
    if (!this.list().some((a) => lower(a.address) === lower(address))) throw new WalletAccountError('That account is not in this wallet.');
    const trimmed = String(name ?? '').trim();
    if (!trimmed) throw new WalletAccountError('A name is required.');
    await this.session.update((cur) => ({ ...cur, names: { ...cur.names, [lower(address)]: trimmed } }));
  }

  /** The Secret Recovery Phrase, only after the password is checked again (MetaMask asks for it every time). */
  async revealMnemonic(password: string): Promise<string> {
    await this.session.verifyPassword(password);
    const c = this.contents();
    if (!c.hd) throw new WalletAccountError('This wallet has no Secret Recovery Phrase.');
    return c.hd.mnemonic;
  }

  // ---- Test accounts (Config tab: Load / Unload) --------------------------------------------------------------------------------------

  /** How many of Hardhat's standard test accounts are in this wallet, however they got here. */
  hardhatTestAccountStatus(): { loaded: number; total: number } {
    const present = new Set(this.list().map((a) => lower(a.address)));
    let loaded = 0;
    for (const address of HARDHAT_DEV_ADDRESSES) if (present.has(address)) loaded += 1;
    return { loaded, total: HARDHAT_DEV_ADDRESSES.size };
  }

  /**
   * Add the standard Hardhat test accounts that are missing, as IMPORTED accounts (they never become part of the wallet's own phrase),
   * marked devOrigin so they can sign only on the local chain. Names are "Hardhat 0" to "Hardhat 19". One vault update for all of them.
   */
  async loadHardhatTestAccounts(): Promise<{ added: number; alreadyPresent: number; total: number }> {
    const present = new Set(this.list().map((a) => lower(a.address)));
    const fresh: ImportedKey[] = [];
    const names: Record<string, string> = {};
    for (let i = 0; i < HARDHAT_DEV_ADDRESSES.size; i++) {
      const account = mnemonicToAccount(HARDHAT_DEV_MNEMONIC, { addressIndex: i });
      if (present.has(lower(account.address))) continue;
      const key = account.getHdKey().privateKey;
      if (!key) continue;
      const privateKey = `0x${Array.from(key, (b) => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
      fresh.push({ privateKey, address: account.address, devOrigin: true });
      names[lower(account.address)] = `Hardhat ${i}`;
    }
    if (fresh.length) {
      await this.session.update((cur) => ({ ...cur, imported: [...cur.imported, ...fresh], names: { ...cur.names, ...names } }));
    }
    return { added: fresh.length, alreadyPresent: HARDHAT_DEV_ADDRESSES.size - fresh.length, total: HARDHAT_DEV_ADDRESSES.size };
  }

  /**
   * Remove the standard Hardhat test accounts that were imported. A test account that is part of the wallet's OWN phrase (the wallet was made from
   * Hardhat's phrase) cannot be removed, and is reported in `kept`. If the active account goes, the active choice resets.
   */
  async unloadHardhatTestAccounts(): Promise<{ removed: number; kept: number }> {
    const all = this.list();
    const isTest = (a: WalletAccountRecord) => HARDHAT_DEV_ADDRESSES.has(lower(a.address));
    const kept = all.filter((a) => isTest(a) && a.source !== 'imported').length;
    const goners = new Set(all.filter((a) => isTest(a) && a.source === 'imported').map((a) => lower(a.address)));
    if (goners.size) {
      await this.session.update((cur) => {
        const names = { ...cur.names };
        for (const address of goners) delete names[address];
        return { ...cur, imported: cur.imported.filter((k) => !goners.has(lower(k.address))), names, active: cur.active && goners.has(cur.active) ? undefined : cur.active };
      });
    }
    return { removed: goners.size, kept };
  }

  /** The private key of one account, only after the password is checked again (MetaMask: Account details -> Show private key). */
  async revealPrivateKey(password: string, address: string): Promise<`0x${string}`> {
    await this.session.verifyPassword(password);
    const c = this.contents();
    const target = lower(address);
    if (c.hd) {
      for (let i = 0; i < c.hd.count; i++) {
        if (lower(deriveAddress(c.hd.mnemonic, i)) === target) {
          const key = mnemonicToAccount(c.hd.mnemonic, { addressIndex: i }).getHdKey().privateKey;
          if (!key) throw new WalletAccountError('That account has no private key.');
          return `0x${Array.from(key, (b) => b.toString(16).padStart(2, '0')).join('')}`;
        }
      }
    }
    const imported = c.imported.find((k) => lower(k.address) === target);
    if (imported) return imported.privateKey;
    throw new WalletAccountError('That account is not in this wallet.');
  }

  /**
   * The viem account that can sign for `address`. For use INSIDE the host that owns the vault (the signing step); the result holds a key and
   * must never be returned to a UI page or logged.
   */
  getSigningAccount(address: string): { account: HDAccount | PrivateKeyAccount; devOrigin: boolean } {
    const c = this.contents();
    const target = lower(address);
    if (c.hd) {
      for (let i = 0; i < c.hd.count; i++) {
        if (lower(deriveAddress(c.hd.mnemonic, i)) === target) return { account: mnemonicToAccount(c.hd.mnemonic, { addressIndex: i }), devOrigin: !!c.hd.devOrigin || isHardhatDevAddress(target) };
      }
    }
    const imported = c.imported.find((k) => lower(k.address) === target);
    if (imported) return { account: privateKeyToAccount(imported.privateKey), devOrigin: !!imported.devOrigin || isHardhatDevAddress(target) };
    throw new WalletAccountError('That account is not in this wallet.');
  }
}
