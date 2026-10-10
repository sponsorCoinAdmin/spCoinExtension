// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/vault/localSigner.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E3) -- the LOCAL implementation of signing: the vault's accounts (walletAccounts.ts) behind the
// approval queue (approvals.ts). Every message signature and every transaction is queued first and only signed or sent after the user approves it
// in the wallet UI, as in MetaMask. Keys never leave this module: callers get a signature or a transaction hash.
//
// Safety rule carried over from the web wallet (devOrigin): an account made from a published Hardhat key can sign only on the local test chain
// (31337); on any other chain the request is refused before it is even queued.
//
// Sending uses viem: it fills the nonce, gas and fees from the chain through `rpcUrlFor` (the host supplies the endpoint from the network registry,
// so this module stays free of host data) and broadcasts the signed transaction.
import { createWalletClient, hexToBytes, http, type Hex, type Transport } from 'viem';
import { ApprovalController } from './approvals';
import { VaultLockedError, type VaultSession } from './vaultSession';
import { WalletAccountError, WalletAccounts, type WalletVaultContents } from './walletAccounts';

export const HARDHAT_CHAIN_ID = 31337;

export class DevAccountOnRealChainError extends Error {
  constructor() {
    super('This account uses a published development key and can only sign on the local test chain (31337).');
    this.name = 'DevAccountOnRealChainError';
  }
}

export interface LocalTransactionRequest {
  from: string;
  to?: string;
  /** Wei. */
  value?: bigint;
  data?: string;
  chainId: number;
  origin?: string;
}

export interface LocalSignerOptions {
  session: VaultSession<WalletVaultContents>;
  accounts: WalletAccounts;
  approvals: ApprovalController;
  /** The RPC endpoint for a chain id (from the network registry); undefined when the chain is not configured. */
  rpcUrlFor: (chainId: number) => string | undefined;
  /** Replace the transport (tests pass an in-memory chain); default is http(rpcUrlFor(chainId)). */
  transportFor?: (chainId: number) => Transport | undefined;
}

/** Text for the confirmation screen: the bytes as UTF-8 when they are text, the hex otherwise. */
function rawToDisplay(raw: Hex): string {
  try {
    const bytes = hexToBytes(raw);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return raw;
  }
}

export class LocalSigner {
  constructor(private readonly o: LocalSignerOptions) {}

  private requireAccount(address: string) {
    if (!this.o.session.isUnlocked()) throw new VaultLockedError();
    // getSigningAccount throws WalletAccountError for an address that is not in the wallet.
    return this.o.accounts.getSigningAccount(address);
  }

  /**
   * Queue a personal_sign style message; resolves with the signature after the user approves. `message` is text, or { raw } bytes (what
   * personal_sign carries; EIP-191 signing of raw bytes and of the same text are identical).
   */
  signMessage(params: { address: string; message: string | { raw: Hex }; origin?: string }): Promise<Hex> {
    const { account } = this.requireAccount(params.address);
    const shown = typeof params.message === 'string' ? params.message : rawToDisplay(params.message.raw);
    return this.o.approvals.request<Hex>(
      {
        kind: 'sign',
        origin: params.origin ?? 'wallet',
        summary: `Sign a message with ${account.address}`,
        details: { address: account.address, message: shown },
      },
      async () => {
        if (!this.o.session.isUnlocked()) throw new VaultLockedError();
        // Re-fetch inside the approved work: the wallet may have locked or changed while the request waited.
        return this.o.accounts.getSigningAccount(params.address).account.signMessage({ message: params.message });
      },
    );
  }

  /** Queue EIP-712 typed data (eth_signTypedData_v4); resolves with the signature after the user approves. */
  signTypedData(params: { address: string; typedData: Record<string, unknown>; origin?: string }): Promise<Hex> {
    const { account } = this.requireAccount(params.address);
    return this.o.approvals.request<Hex>(
      {
        kind: 'sign',
        origin: params.origin ?? 'wallet',
        summary: `Sign typed data with ${account.address}`,
        details: { address: account.address, typedData: params.typedData },
      },
      async () => {
        if (!this.o.session.isUnlocked()) throw new VaultLockedError();
        return this.o.accounts.getSigningAccount(params.address).account.signTypedData(params.typedData as Parameters<typeof account.signTypedData>[0]);
      },
    );
  }

  /** Queue a transaction; resolves with its hash after the user approves and it is broadcast. */
  sendTransaction(request: LocalTransactionRequest): Promise<{ hash: Hex }> {
    const { account, devOrigin } = this.requireAccount(request.from);
    if (devOrigin && request.chainId !== HARDHAT_CHAIN_ID) throw new DevAccountOnRealChainError();
    const transport = this.o.transportFor?.(request.chainId) ?? this.rpcTransport(request.chainId);
    return this.o.approvals.request<{ hash: Hex }>(
      {
        kind: 'transaction',
        origin: request.origin ?? 'wallet',
        summary: `Send ${request.value ?? 0n} wei${request.to ? ` to ${request.to}` : ' (contract creation)'} on chain ${request.chainId}`,
        details: { from: account.address, to: request.to, value: request.value?.toString(), data: request.data, chainId: request.chainId },
      },
      async () => {
        if (!this.o.session.isUnlocked()) throw new VaultLockedError();
        const signing = this.o.accounts.getSigningAccount(request.from);
        if (signing.devOrigin && request.chainId !== HARDHAT_CHAIN_ID) throw new DevAccountOnRealChainError();
        const rpc = this.o.rpcUrlFor(request.chainId) ?? '';
        const client = createWalletClient({
          account: signing.account,
          chain: { id: request.chainId, name: `chain-${request.chainId}`, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } },
          transport,
        });
        const hash = await client.sendTransaction({
          to: request.to as Hex | undefined,
          value: request.value,
          data: request.data as Hex | undefined,
        } as Parameters<typeof client.sendTransaction>[0]);
        return { hash };
      },
    );
  }

  private rpcTransport(chainId: number): Transport {
    const rpc = this.o.rpcUrlFor(chainId);
    if (!rpc) throw new WalletAccountError(`No network is configured for chain ${chainId}.`);
    return http(rpc);
  }
}
