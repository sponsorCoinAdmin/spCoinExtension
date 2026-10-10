// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/provider/injectedWallet.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E6 / table row 18) -- the PROVIDER implementation of the wallet API, for a web page (the web app)
// that does not hold keys: it finds the Merit Wallet extension through EIP-6963 and talks to it with EIP-1193 requests. This is MetaMask's own
// relationship to a dapp. If the extension is not installed, discovery resolves to null and the host shows "Install the Merit Wallet extension"
// instead of a connect button. No React and no chrome.* here: it needs only a window with the standard events.

export const MERIT_RDNS = 'org.sponsorcoin.merit';

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): unknown;
  removeListener?(event: string, listener: (...args: unknown[]) => void): unknown;
}

export interface Eip6963Detail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: Eip1193Provider;
}

/** Minimal window surface used for discovery (a real window, or a stand-in in tests). */
export interface DiscoveryWindow {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
  dispatchEvent(event: Event): boolean;
}

/** Ask every wallet on the page to announce itself and collect the answers for `timeoutMs`. */
export function discoverWallets(win: DiscoveryWindow, timeoutMs = 300): Promise<Eip6963Detail[]> {
  return new Promise((resolve) => {
    const found = new Map<string, Eip6963Detail>();
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963Detail>).detail;
      if (detail?.info?.uuid && detail.provider) found.set(detail.info.uuid, detail);
    };
    win.addEventListener('eip6963:announceProvider', onAnnounce);
    win.dispatchEvent(new Event('eip6963:requestProvider'));
    setTimeout(() => {
      win.removeEventListener('eip6963:announceProvider', onAnnounce);
      resolve(Array.from(found.values()));
    }, timeoutMs);
  });
}

/** The Merit Wallet extension's provider, or null when it is not installed. */
export async function findMeritWallet(win: DiscoveryWindow, timeoutMs = 300): Promise<Eip6963Detail | null> {
  return (await discoverWallets(win, timeoutMs)).find((d) => d.info.rdns === MERIT_RDNS) ?? null;
}

export interface InjectedWalletApi {
  /** Ask the user to connect this site; resolves with the accounts (the first is the active one). */
  connect(): Promise<string[]>;
  /** Accounts this site may already see (no prompt). */
  accounts(): Promise<string[]>;
  chainId(): Promise<number>;
  switchChain(chainId: number): Promise<void>;
  /** personal_sign: text in, signature out, after the user approves in the wallet. */
  signMessage(address: string, message: string): Promise<string>;
  /** Wei as a bigint; resolves with the transaction hash after the user approves in the wallet. */
  sendTransaction(tx: { from: string; to?: string; value?: bigint; data?: string }): Promise<string>;
  onAccountsChanged(listener: (accounts: string[]) => void): () => void;
  onChainChanged(listener: (chainId: number) => void): () => void;
}

const utf8Hex = (text: string) => `0x${Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, '0')).join('')}`;

export function createInjectedWalletApi(provider: Eip1193Provider): InjectedWalletApi {
  const subscribe = (event: string, handler: (...args: unknown[]) => void) => {
    provider.on?.(event, handler);
    return () => {
      provider.removeListener?.(event, handler);
    };
  };
  return {
    async connect() {
      return (await provider.request({ method: 'eth_requestAccounts' })) as string[];
    },
    async accounts() {
      return (await provider.request({ method: 'eth_accounts' })) as string[];
    },
    async chainId() {
      return Number(BigInt((await provider.request({ method: 'eth_chainId' })) as string));
    },
    async switchChain(chainId) {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${chainId.toString(16)}` }] });
    },
    async signMessage(address, message) {
      return (await provider.request({ method: 'personal_sign', params: [utf8Hex(message), address] })) as string;
    },
    async sendTransaction(tx) {
      return (await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: tx.from, ...(tx.to ? { to: tx.to } : {}), ...(tx.value !== undefined ? { value: `0x${tx.value.toString(16)}` } : {}), ...(tx.data ? { data: tx.data } : {}) }],
      })) as string;
    },
    onAccountsChanged: (listener) => subscribe('accountsChanged', (a) => listener(a as string[])),
    onChainChanged: (listener) => subscribe('chainChanged', (c) => listener(Number(BigInt(c as string)))),
  };
}
