// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/vault/providerController.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E6 / table row 18) -- what a web page can ask the wallet to do, the MetaMask way (EIP-1193). A page
// never sees a key: it sends { method, params } and gets a result or a ProviderRpcError. Rules kept from MetaMask: accounts are visible to a page
// only after the user approved a connection for that origin (eth_requestAccounts waits in the approval queue); signing and sending always wait in
// the approval queue; a locked wallet shows no accounts; read-only chain methods are forwarded to the active network's RPC.
//
// Pure TypeScript over the vault pieces (session, accounts, signer, approvals) and three host functions (permissions storage, the active chain,
// an RPC fetcher), so the extension worker supplies chrome.storage and fetch, and the tests supply memory. No key leaves this module.
import { hexToBigInt, type Hex } from 'viem';
import { ApprovalController, ApprovalRejectedError } from './approvals';
import { DevAccountOnRealChainError, LocalSigner } from './localSigner';
import type { VaultSession } from './vaultSession';
import { WalletAccountError, WalletAccounts, type WalletVaultContents } from './walletAccounts';

/** EIP-1193 error codes. */
export const PROVIDER_ERROR = {
  userRejected: 4001,
  unauthorized: 4100,
  unsupportedMethod: 4200,
  disconnected: 4900,
  chainDisconnected: 4901,
  unrecognizedChain: 4902,
  invalidParams: -32602,
  internal: -32603,
  methodNotFound: -32601,
} as const;

export class ProviderRpcError extends Error {
  constructor(public readonly code: number, message: string) {
    super(message);
    this.name = 'ProviderRpcError';
  }
}

/** Which accounts each web origin may see. */
export interface PermissionStore {
  get(origin: string): Promise<string[]>;
  set(origin: string, addresses: string[]): Promise<void>;
  remove(origin: string): Promise<void>;
  origins(): Promise<string[]>;
}

export function createMemoryPermissionStore(): PermissionStore {
  const map = new Map<string, string[]>();
  return {
    get: async (o) => [...(map.get(o) ?? [])],
    set: async (o, a) => {
      map.set(o, [...a]);
    },
    remove: async (o) => {
      map.delete(o);
    },
    origins: async () => Array.from(map.keys()),
  };
}

export interface ProviderControllerOptions {
  session: VaultSession<WalletVaultContents>;
  accounts: WalletAccounts;
  approvals: ApprovalController;
  signer: LocalSigner;
  permissions: PermissionStore;
  /** The network the wallet is on. */
  getChainId: () => Promise<number> | number;
  setChainId: (chainId: number) => Promise<void> | void;
  /** Is this chain in the network registry (can the wallet switch to it)? */
  isKnownChain: (chainId: number) => boolean;
  /** Forward one JSON-RPC call to the chain's node. */
  rpc: (chainId: number, method: string, params: unknown[]) => Promise<unknown>;
}

export type ProviderEvent =
  | { origin?: string; event: 'accountsChanged'; data: string[] }
  | { origin?: string; event: 'chainChanged'; data: string }
  | { origin?: string; event: 'disconnect'; data: { code: number; message: string } };

// Reads that are forwarded to the node. Anything that signs, sends, or reveals accounts is handled here instead and never forwarded.
const FORWARDED = /^(eth_(blockNumber|call|chainId|estimateGas|feeHistory|gasPrice|getBalance|getBlockByHash|getBlockByNumber|getBlockTransactionCountBy(Hash|Number)|getCode|getLogs|getStorageAt|getTransactionByHash|getTransactionCount|getTransactionReceipt|maxPriorityFeePerGas|sendRawTransaction|syncing)|net_(version|listening|peerCount)|web3_(clientVersion|sha3))$/;

const hexChain = (id: number) => `0x${id.toString(16)}`;
const lower = (a: string) => a.toLowerCase();

export class ProviderController {
  private listeners = new Set<(e: ProviderEvent) => void>();

  constructor(private readonly o: ProviderControllerOptions) {}

  onEvent(listener: (e: ProviderEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(e: ProviderEvent) {
    for (const l of Array.from(this.listeners)) l(e);
  }

  /** The accounts this origin may see right now: none while the wallet is locked or the origin was never approved. */
  private async visibleAccounts(origin: string): Promise<string[]> {
    if (!this.o.session.isUnlocked()) return [];
    const granted = (await this.o.permissions.get(origin)).map(lower);
    if (!granted.length) return [];
    const inWallet = this.o.accounts.list().map((a) => a.address);
    const active = this.o.accounts.activeAddress();
    const allowed = inWallet.filter((a) => granted.includes(lower(a)));
    // MetaMask lists the selected account first.
    return allowed.sort((a, b) => (active && lower(a) === lower(active) ? -1 : active && lower(b) === lower(active) ? 1 : 0));
  }

  private async requireAccount(origin: string, address: unknown): Promise<string> {
    if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address)) throw new ProviderRpcError(PROVIDER_ERROR.invalidParams, 'Invalid address.');
    const visible = await this.visibleAccounts(origin);
    if (!visible.some((a) => lower(a) === lower(address))) throw new ProviderRpcError(PROVIDER_ERROR.unauthorized, 'The requested account has not been authorized by the user.');
    return address;
  }

  /** Handle one request from a web page. Resolves with the JSON-RPC result or throws ProviderRpcError. */
  async handle(origin: string, request: { method: string; params?: unknown }): Promise<unknown> {
    try {
      return await this.dispatch(origin, request.method, Array.isArray(request.params) ? request.params : request.params === undefined ? [] : [request.params]);
    } catch (error) {
      throw this.toProviderError(error);
    }
  }

  private toProviderError(error: unknown): ProviderRpcError {
    if (error instanceof ProviderRpcError) return error;
    if (error instanceof ApprovalRejectedError) return new ProviderRpcError(PROVIDER_ERROR.userRejected, 'User rejected the request.');
    if (error instanceof DevAccountOnRealChainError) return new ProviderRpcError(PROVIDER_ERROR.unauthorized, error.message);
    if (error instanceof WalletAccountError) return new ProviderRpcError(PROVIDER_ERROR.unauthorized, error.message);
    if (error instanceof Error && error.name === 'VaultLockedError') return new ProviderRpcError(PROVIDER_ERROR.unauthorized, 'The wallet is locked.');
    return new ProviderRpcError(PROVIDER_ERROR.internal, error instanceof Error ? error.message : String(error));
  }

  private async dispatch(origin: string, method: string, params: unknown[]): Promise<unknown> {
    switch (method) {
      case 'eth_chainId':
        return hexChain(await this.o.getChainId());
      case 'net_version':
        return String(await this.o.getChainId());
      case 'eth_accounts':
        return this.visibleAccounts(origin);
      case 'eth_requestAccounts':
      case 'wallet_requestPermissions':
        return this.requestAccounts(origin);
      case 'wallet_getPermissions':
        return (await this.visibleAccounts(origin)).length ? [{ parentCapability: 'eth_accounts', invoker: origin, caveats: [] }] : [];
      case 'wallet_revokePermissions':
        await this.o.permissions.remove(origin);
        this.emit({ origin, event: 'accountsChanged', data: [] });
        return null;
      case 'personal_sign': {
        // personal_sign is [message, address]; some dapps send [address, message], so accept either order.
        const [a, b] = params as string[];
        const [message, address] = typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a) && !(typeof b === 'string' && /^0x[0-9a-fA-F]{40}$/.test(b)) ? [b, a] : [a, b];
        if (typeof message !== 'string' || !/^0x([0-9a-fA-F]{2})*$/.test(message)) throw new ProviderRpcError(PROVIDER_ERROR.invalidParams, 'personal_sign needs a hex message.');
        await this.requireAccount(origin, address);
        return this.o.signer.signMessage({ address, message: { raw: message as Hex }, origin });
      }
      case 'eth_signTypedData_v4':
      case 'eth_signTypedData': {
        const [address, data] = params as [string, unknown];
        await this.requireAccount(origin, address);
        let typedData: unknown = data;
        if (typeof data === 'string') {
          try {
            typedData = JSON.parse(data);
          } catch {
            throw new ProviderRpcError(PROVIDER_ERROR.invalidParams, 'Typed data is not valid JSON.');
          }
        }
        if (!typedData || typeof typedData !== 'object') throw new ProviderRpcError(PROVIDER_ERROR.invalidParams, 'Typed data is required.');
        // The signed domain must be on the chain the wallet is on (MetaMask refuses a mismatch).
        const domainChain = (typedData as { domain?: { chainId?: string | number } }).domain?.chainId;
        if (domainChain !== undefined && Number(domainChain) !== Number(await this.o.getChainId())) throw new ProviderRpcError(PROVIDER_ERROR.invalidParams, 'The typed data is for a different chain.');
        return this.o.signer.signTypedData({ address, typedData: typedData as Record<string, unknown>, origin });
      }
      case 'eth_sendTransaction': {
        const tx = (params[0] ?? {}) as { from?: string; to?: string; value?: string; data?: string; chainId?: string };
        const from = await this.requireAccount(origin, tx.from);
        const chainId = await this.o.getChainId();
        if (tx.chainId !== undefined && Number(tx.chainId) !== chainId) throw new ProviderRpcError(PROVIDER_ERROR.invalidParams, 'The transaction is for a different chain.');
        const { hash } = await this.o.signer.sendTransaction({
          from,
          to: tx.to,
          value: tx.value === undefined ? undefined : hexToBigInt(tx.value as Hex),
          data: tx.data,
          chainId,
          origin,
        });
        return hash;
      }
      case 'wallet_switchEthereumChain': {
        const requested = (params[0] as { chainId?: string } | undefined)?.chainId;
        if (typeof requested !== 'string' || !/^0x[0-9a-fA-F]+$/.test(requested)) throw new ProviderRpcError(PROVIDER_ERROR.invalidParams, 'chainId must be a hex string.');
        const id = Number(BigInt(requested));
        if (!this.o.isKnownChain(id)) throw new ProviderRpcError(PROVIDER_ERROR.unrecognizedChain, 'Unrecognized chain ID. Try adding the chain first.');
        await this.setChain(id);
        return null;
      }
      case 'wallet_addEthereumChain':
        throw new ProviderRpcError(PROVIDER_ERROR.unsupportedMethod, 'Adding networks is not supported yet.');
      default:
        if (FORWARDED.test(method)) return this.o.rpc(await this.o.getChainId(), method, params);
        throw new ProviderRpcError(PROVIDER_ERROR.methodNotFound, `The method ${method} is not supported.`);
    }
  }

  private async requestAccounts(origin: string): Promise<string[]> {
    const already = await this.visibleAccounts(origin);
    if (already.length) return already;
    // The user picks: approving connects the account that is active in the wallet.
    const granted = await this.o.approvals.request<string[]>(
      { kind: 'connect', origin, summary: `${origin} wants to connect to your wallet`, details: { origin } },
      async () => {
        if (!this.o.session.isUnlocked()) throw Object.assign(new Error('The wallet is locked.'), { name: 'VaultLockedError' });
        const active = this.o.accounts.activeAddress();
        if (!active) throw new ProviderRpcError(PROVIDER_ERROR.unauthorized, 'The wallet has no account.');
        await this.o.permissions.set(origin, [active]);
        return [active];
      },
    );
    return granted;
  }

  /** The user (or a page) moved the wallet to another network: tell every connected page. */
  async setChain(chainId: number): Promise<void> {
    await this.o.setChainId(chainId);
    this.emit({ event: 'chainChanged', data: hexChain(chainId) });
  }

  /** The wallet's active account changed or the wallet locked: tell each connected page what it can see now. */
  async notifyAccountsChanged(): Promise<void> {
    for (const origin of await this.o.permissions.origins()) this.emit({ origin, event: 'accountsChanged', data: await this.visibleAccounts(origin) });
  }
}
