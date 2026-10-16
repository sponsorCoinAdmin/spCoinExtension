// File: src/auth/ledgerTransport.ts
//
// 2026-10-13 (docs/design/accountAuthDesign.txt section 17 item 12, docs/design/accountAuthDesign.txt row 16, Q3): the LEDGER transport over WebHID: the one HardwareTransport (src/auth/hardwareAuthenticator.ts) a Ledger needs. The device keeps the keys and shows every request on its own screen;
// this file only speaks to it: open it (the browser's USB permission prompt, which needs a user gesture), read the first accounts of the Ledger Live path, sign a personal message, sign a transaction. It signs NOTHING itself and holds no key. What a Ledger and a Trezor share
// (paths, one request at a time, device state, nonce / gas / fees, signature assembly) is src/auth/hardwareShared.ts.
// The Ledger libraries (@ledgerhq/hw-transport-webhid, @ledgerhq/hw-app-eth) are NOT bundled here: the host passes loaders for them ((): Promise<module>, i.e. () => import('@ledgerhq/hw-transport-webhid')), so a host that never offers a hardware wallet never loads them,
// and the tests drive this file with a fake device that signs with a known test key.
// STATUS: built and tested against a simulated device (test/ledgerTransport.test.mjs, the signatures are checked against viem's own). NOT yet run on a real Ledger: a person with a device must connect, list, sign a message and a transaction (docs/design/accountAuthDesign.txt section 17 item 12).
import { HardwareError, type HardwareTransport } from './hardwareAuthenticator';
import {
  assembleSignedTransaction,
  createDeviceState,
  createSerialQueue,
  ledgerLivePath,
  messageSignature,
  prepareTransaction,
  strip0x,
  unsignedHex,
  utf8Hex,
  type ChainRpc,
  type DeviceAccount,
} from './hardwareShared';

export { ledgerLivePath };

/** The slice of @ledgerhq/hw-transport-webhid this file uses (its default export). */
export interface LedgerHidTransportClass {
  isSupported?(): Promise<boolean>;
  create(): Promise<LedgerHidDevice>;
  /** Reopens a device the person already granted, without a prompt; null when there is none. */
  openConnected?(): Promise<LedgerHidDevice | null>;
}
export interface LedgerHidDevice {
  close(): Promise<void>;
  on?(event: string, listener: () => void): void;
}
/** The slice of @ledgerhq/hw-app-eth this file uses (its default export is a class taking the device). */
export interface LedgerEthApp {
  getAddress(path: string, display?: boolean): Promise<{ address: string }>;
  signPersonalMessage(path: string, messageHex: string): Promise<{ v: number | string; r: string; s: string }>;
  signTransaction(path: string, rawTxHex: string, resolution?: unknown): Promise<{ v: string; r: string; s: string }>;
}
export type LedgerEthAppClass = new (device: LedgerHidDevice) => LedgerEthApp;

export interface LedgerTransportOptions {
  /** () => import('@ledgerhq/hw-transport-webhid'): loaded only when a device is opened. */
  loadTransport: () => Promise<{ default: LedgerHidTransportClass }>;
  /** () => import('@ledgerhq/hw-app-eth'). */
  loadEthApp: () => Promise<{ default: LedgerEthAppClass | { default: LedgerEthAppClass } }>;
  /** A JSON-RPC call to the chain (the host's own RPC list). Needed to sign a transaction (nonce, gas, fees). */
  rpc: ChainRpc;
  /** How many accounts of the Ledger Live path to offer (default 5). */
  accountCount?: number;
  /** Optional: Ledger's clear-signing resolution for a transaction (token / NFT names on the device screen). Without it a contract call needs "blind signing" enabled on the device. */
  resolveTransaction?: (rawTxHex: string) => Promise<unknown>;
  /** Overrides, for tests and hosts that know better. */
  isSupported?: () => boolean;
}

/** Ledger status words and transport errors -> the hardware error set. */
export function translateLedgerError(error: unknown): HardwareError {
  if (error instanceof HardwareError) return error;
  const e = (error ?? {}) as { statusCode?: number; name?: string; message?: string };
  const text = typeof e.message === 'string' && e.message ? e.message : '';
  switch (e.statusCode) {
    case 0x6985: // conditions of use not satisfied: the person pressed Reject
    case 0x5501: // user refused on the device
      return new HardwareError('rejected', 'You declined it on the Ledger.');
    case 0x6982: // security status not satisfied: the device is locked
    case 0x5515:
      return new HardwareError('locked', 'Unlock your Ledger and open its Ethereum app.');
    case 0x6d00: // instruction not supported: the Ethereum app is not open
    case 0x6e00:
    case 0x6e01:
    case 0x6511:
    case 0x6a15:
      return new HardwareError('app_closed', 'Open the Ethereum app on your Ledger.');
    case 0x6a80: // invalid data: usually blind signing is off for a contract call
    case 0x6a8d:
      return new HardwareError('unsupported', 'The Ledger could not read that request. For a contract call, turn on "blind signing" in the Ethereum app settings.');
    default:
      break;
  }
  if (e.name === 'TransportOpenUserCancelled' || e.name === 'NotFoundError' || /no device selected|access denied|user cancel/i.test(text)) return new HardwareError('unavailable', 'No Ledger was selected.');
  if (e.name === 'DisconnectedDevice' || e.name === 'DisconnectedDeviceDuringOperation' || /disconnected/i.test(text)) return new HardwareError('not_connected', 'The Ledger was unplugged. Connect it again.');
  if (e.name === 'TransportInterfaceNotAvailable' || /already open|in use|claimed/i.test(text)) return new HardwareError('unavailable', 'The Ledger is in use by another app (close Ledger Live and try again).');
  return new HardwareError('unavailable', text || 'The Ledger did not answer.');
}

/** The Ledger transport: the common interface plus restore() (reopen a device granted earlier, no prompt). */
export type LedgerTransport = HardwareTransport & { restore(): Promise<{ address: string; name?: string; path?: string }[]> };

export function createLedgerTransport(options: LedgerTransportOptions): LedgerTransport {
  const count = options.accountCount ?? 5;
  let device: LedgerHidDevice | undefined;
  let app: LedgerEthApp | undefined;
  const state = createDeviceState();
  const serial = createSerialQueue();

  const pathOf = (address: string): string => {
    const row = state.find(address);
    if (!row) throw new HardwareError('unsupported', `${address} is not one of the accounts read from this Ledger.`);
    return row.path;
  };
  const needApp = (): LedgerEthApp => {
    if (!app || !device) throw new HardwareError('not_connected', 'The Ledger is not connected. Connect it first.');
    return app;
  };

  async function attach(opened: LedgerHidDevice): Promise<DeviceAccount[]> {
    const mod = await options.loadEthApp();
    const holder = mod.default as unknown as { default?: LedgerEthAppClass };
    const Eth = (holder.default ?? (mod.default as LedgerEthAppClass)) as LedgerEthAppClass;
    const next = new Eth(opened);
    const found: DeviceAccount[] = [];
    try {
      for (let i = 0; i < count; i++) {
        const path = ledgerLivePath(i);
        const { address } = await next.getAddress(path, false);
        found.push({ address, name: `Ledger Account ${i + 1}`, path });
      }
    } catch (error) {
      await opened.close().catch(() => undefined);
      throw translateLedgerError(error);
    }
    device = opened;
    app = next;
    opened.on?.('disconnect', () => {
      device = undefined;
      app = undefined;
      state.clear();
    });
    state.set(found);
    return state.accounts();
  }

  return {
    kind: 'ledger',
    isSupported() {
      if (options.isSupported) return options.isSupported();
      const nav = typeof navigator === 'undefined' ? undefined : (navigator as unknown as { hid?: unknown });
      return !!nav?.hid && (typeof globalThis === 'undefined' || (globalThis as { isSecureContext?: boolean }).isSecureContext !== false);
    },
    isConnected() {
      return !!device && !!app;
    },
    async connect() {
      return serial(async () => {
        try {
          const { default: Transport } = await options.loadTransport();
          if (device) await device.close().catch(() => undefined);
          device = undefined;
          app = undefined;
          state.clear();
          return await attach(await Transport.create());
        } catch (error) {
          throw translateLedgerError(error);
        }
      });
    },
    /** Reopen a device the person granted earlier, with no prompt (a page reload). Resolves with the accounts, or [] when none is there. */
    async restore() {
      return serial(async () => {
        try {
          const { default: Transport } = await options.loadTransport();
          const opened = Transport.openConnected ? await Transport.openConnected() : null;
          return opened ? await attach(opened) : [];
        } catch {
          return [];
        }
      });
    },
    async disconnect() {
      const old = device;
      device = undefined;
      app = undefined;
      state.clear();
      await old?.close().catch(() => undefined);
    },
    accounts: () => state.accounts(),
    signMessage(address, message) {
      return serial(async () => {
        try {
          const { v, r, s } = await needApp().signPersonalMessage(pathOf(address), utf8Hex(message));
          return messageSignature(r, s, v);
        } catch (error) {
          throw translateLedgerError(error);
        }
      });
    },
    signTransaction(tx) {
      return serial(async () => {
        try {
          const unsigned = await prepareTransaction(options.rpc, tx);
          const path = pathOf(tx.from);
          const rawHex = unsignedHex(unsigned);
          let resolution: unknown = null;
          if (options.resolveTransaction) resolution = await options.resolveTransaction(rawHex).catch(() => null);
          const { v, r, s } = await needApp().signTransaction(path, rawHex, resolution);
          return assembleSignedTransaction(unsigned, { r: strip0x(r), s: strip0x(s), v });
        } catch (error) {
          throw translateLedgerError(error);
        }
      });
    },
    onChange: (listener) => state.onChange(listener),
  };
}
