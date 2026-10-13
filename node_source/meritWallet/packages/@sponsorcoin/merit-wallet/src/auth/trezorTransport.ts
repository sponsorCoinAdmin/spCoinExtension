// File: src/auth/trezorTransport.ts
//
// 2026-10-13 (docs/design/accountAuthDesign.txt section 17 item 12, owner request: Trezor beside Ledger, shared methods): the TREZOR transport over Trezor Connect (@trezor/connect-web): the second HardwareTransport (src/auth/hardwareAuthenticator.ts). The device keeps the keys and shows every request on its own
// screen; Trezor Connect opens its own popup for the PIN and the permission, so this file only asks: read the first accounts of the standard Ethereum path, sign a personal message, sign a transaction. It signs NOTHING itself and holds no key. What a Trezor and a Ledger share (paths, one request
// at a time, device state, nonce / gas / fees, signature assembly) is src/auth/hardwareShared.ts. The Trezor library is NOT bundled here: the host passes a loader (() => import('@trezor/connect-web')), so a host that never offers a Trezor never loads it, and the tests drive this file with a fake
// Trezor Connect that signs with a known test key.
// Trezor Connect is stateless: it does not announce an unplug, so "connected" means "accounts were read and not disconnected". A request after an unplug fails with the device's own error and the person connects again.
// STATUS: built and tested against a simulated Trezor Connect (test/trezorTransport.test.mjs, the signatures are checked against viem's own). NOT yet run on a real Trezor: a person with a device must connect, list, sign a message and a transaction (docs/design/accountAuthDesign.txt section 17 item 12).
import { HardwareError, type HardwareTransport } from './hardwareAuthenticator';
import {
  assembleSignedTransaction,
  createDeviceState,
  createSerialQueue,
  ethereumBip44Path,
  hexQuantity,
  messageSignature,
  prepareTransaction,
  strip0x,
  type ChainRpc,
  type DeviceAccount,
} from './hardwareShared';

export type TrezorResponse<T> = { success: true; payload: T } | { success: false; payload: { error: string; code?: string } };

/** The slice of @trezor/connect-web this file uses (its default export). */
export interface TrezorConnectApi {
  init(settings: { manifest: { appName: string; appUrl: string; email: string }; lazyLoad?: boolean; popup?: boolean }): Promise<void>;
  ethereumGetAddress(params: { bundle: Array<{ path: string; showOnTrezor?: boolean }> }): Promise<TrezorResponse<Array<{ address: string; serializedPath?: string }>>>;
  ethereumSignMessage(params: { path: string; message: string; hex?: boolean }): Promise<TrezorResponse<{ address: string; signature: string }>>;
  ethereumSignTransaction(params: { path: string; transaction: Record<string, unknown> }): Promise<TrezorResponse<{ v: string; r: string; s: string }>>;
  dispose?(): void;
}

export interface TrezorTransportOptions {
  /** () => import('@trezor/connect-web'): loaded only when a device is first used. */
  loadConnect: () => Promise<{ default: TrezorConnectApi }>;
  /** Trezor Connect asks every app to say who it is. */
  manifest: { appName: string; appUrl: string; email: string };
  /** A JSON-RPC call to the chain (the host's own RPC list). Needed to sign a transaction (nonce, gas, fees). */
  rpc: ChainRpc;
  /** How many accounts to offer (default 5). */
  accountCount?: number;
  isSupported?: () => boolean;
}

/** What went wrong, from Trezor Connect's error code, in the hardware error set. `during` says whether the person was connecting or asked to approve something. */
export function translateTrezorError(payload: { error?: string; code?: string } | undefined, during: 'connect' | 'sign'): HardwareError {
  const code = payload?.code ?? '';
  const text = payload?.error ?? '';
  if (['Failure_ActionCancelled', 'Method_Cancel', 'Failure_PinCancelled', 'Method_Interrupted', 'Failure_Cancelled'].includes(code) || /cancelled|canceled|closed|rejected/i.test(text)) {
    return during === 'connect' ? new HardwareError('unavailable', 'The Trezor connection was cancelled.') : new HardwareError('rejected', 'You declined it on the Trezor.');
  }
  if (['Failure_PinInvalid', 'Failure_PinMismatch', 'Failure_PinExpected'].includes(code)) return new HardwareError('locked', 'The Trezor PIN was not accepted. Unlock the Trezor and try again.');
  if (['Device_NotFound', 'Transport_Missing', 'Device_UsedElsewhere', 'Device_Disconnected', 'Init_NotInitialized', 'Init_AlreadyInitialized'].includes(code) || /not found|no device|used elsewhere|disconnected/i.test(text)) {
    return new HardwareError(code === 'Device_Disconnected' || /disconnected/i.test(text) ? 'not_connected' : 'unavailable', code === 'Device_UsedElsewhere' ? 'The Trezor is in use by another app or tab. Close it and try again.' : 'No Trezor was found. Plug it in, unlock it and try again.');
  }
  if (['Failure_DataError', 'Failure_FirmwareError', 'Method_NotAllowed'].includes(code)) return new HardwareError('unsupported', text || 'The Trezor could not read that request.');
  return new HardwareError('unavailable', text || 'The Trezor did not answer.');
}

export type TrezorTransport = HardwareTransport;

export function createTrezorTransport(options: TrezorTransportOptions): TrezorTransport {
  const count = options.accountCount ?? 5;
  const state = createDeviceState();
  const serial = createSerialQueue();
  let api: TrezorConnectApi | undefined;
  let initialised = false;

  const pathOf = (address: string): string => {
    const row = state.find(address);
    if (!row) throw new HardwareError('unsupported', `${address} is not one of the accounts read from this Trezor.`);
    return row.path;
  };
  async function ready(): Promise<TrezorConnectApi> {
    if (!api) api = (await options.loadConnect()).default;
    if (!initialised) {
      await api.init({ manifest: options.manifest, lazyLoad: true, popup: true });
      initialised = true;
    }
    return api;
  }
  const need = (): void => {
    if (!state.accounts().length) throw new HardwareError('not_connected', 'The Trezor is not connected. Connect it first.');
  };

  return {
    kind: 'trezor',
    isSupported() {
      if (options.isSupported) return options.isSupported();
      return typeof window !== 'undefined' && (globalThis as { isSecureContext?: boolean }).isSecureContext !== false;
    },
    isConnected: () => state.accounts().length > 0,
    connect() {
      return serial(async () => {
        try {
          const connect = await ready();
          const paths = Array.from({ length: count }, (_, i) => ethereumBip44Path(i));
          const reply = await connect.ethereumGetAddress({ bundle: paths.map((p) => ({ path: `m/${p}`, showOnTrezor: false })) });
          if (!reply.success) throw translateTrezorError(reply.payload, 'connect');
          const rows: DeviceAccount[] = reply.payload.map((a, i) => ({ address: a.address, name: `Trezor Account ${i + 1}`, path: paths[i] }));
          state.set(rows);
          return state.accounts();
        } catch (error) {
          throw error instanceof HardwareError ? error : translateTrezorError({ error: error instanceof Error ? error.message : String(error) }, 'connect');
        }
      });
    },
    async disconnect() {
      state.clear();
    },
    accounts: () => state.accounts(),
    signMessage(address, message) {
      return serial(async () => {
        try {
          need();
          const path = pathOf(address);
          const reply = await (await ready()).ethereumSignMessage({ path: `m/${path}`, message, hex: false });
          if (!reply.success) throw translateTrezorError(reply.payload, 'sign');
          const sig = strip0x(reply.payload.signature);
          return messageSignature(sig.slice(0, 64), sig.slice(64, 128), sig.slice(128, 130));
        } catch (error) {
          throw error instanceof HardwareError ? error : translateTrezorError({ error: error instanceof Error ? error.message : String(error) }, 'sign');
        }
      });
    },
    signTransaction(tx) {
      return serial(async () => {
        try {
          need();
          const path = pathOf(tx.from);
          const unsigned = await prepareTransaction(options.rpc, tx);
          const common = {
            to: tx.to ?? null,
            value: hexQuantity(tx.value ?? 0n),
            gasLimit: hexQuantity(unsigned.gas ?? 0n),
            nonce: hexQuantity(BigInt(unsigned.nonce ?? 0)),
            data: tx.data ?? '0x',
            chainId: tx.chainId,
          };
          const transaction =
            unsigned.type === 'eip1559'
              ? { ...common, maxFeePerGas: hexQuantity(unsigned.maxFeePerGas ?? 0n), maxPriorityFeePerGas: hexQuantity(unsigned.maxPriorityFeePerGas ?? 0n) }
              : { ...common, gasPrice: hexQuantity((unsigned as { gasPrice?: bigint }).gasPrice ?? 0n) };
          const reply = await (await ready()).ethereumSignTransaction({ path: `m/${path}`, transaction });
          if (!reply.success) throw translateTrezorError(reply.payload, 'sign');
          return assembleSignedTransaction(unsigned, reply.payload);
        } catch (error) {
          throw error instanceof HardwareError ? error : translateTrezorError({ error: error instanceof Error ? error.message : String(error) }, 'sign');
        }
      });
    },
    onChange: (listener) => state.onChange(listener),
  };
}
