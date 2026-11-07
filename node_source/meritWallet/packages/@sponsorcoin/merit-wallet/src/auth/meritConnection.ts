// File: src/auth/meritConnection.ts
//
// 2026-11-06 (owner: both directions, any Merit wallet can be the caller or the remote): a Merit wallet's view of ANOTHER Merit wallet's accounts, as an Authenticator, on top of the @sponsorcoin/merit-connect client. The same code serves the web app
// (its Merit (Extension) wallet) and the extension (its Merit (Web App) wallet): the host supplies the client, the side it talks to, and where changes to the kept lists are heard.
//   - accounts() is the HANDSHAKE (the first one after a start, a disconnect or a lost link re-sends this wallet's connected list; later ones pull what the other wallet changed);
//   - knownAccounts() lists every account of the other wallet, connected or disconnected (a disconnected one stays listed);
//   - setAccountConnected() changes ONE account's state from here (connect asks the other wallet; disconnect keeps the account listed);
//   - selectAccounts() / connect() open the other wallet's account selector (the person chooses there);
//   - disconnect() cuts the connection: THIS wallet keeps its accounts connected (persisted), the other wallet disconnects all of its own; the next connection re-sends the list.
// The client is typed structurally here, so this package needs no dependency on @sponsorcoin/merit-connect.
import type { Authenticator, AuthenticatorAccount, AuthenticatorChange } from './authenticator';
import { translateProviderError } from './injectedAuthenticator';

/** The part of a merit-connect client (createMeritConnect) this file uses. */
export interface MeritConnectionClient {
  handshake(side: never, options?: { force?: boolean }): Promise<{ shared: string[] }>;
  listAccounts(side: never): Promise<Array<{ address: string; connected: boolean }>>;
  setAccountConnected(side: never, address: string, connected: boolean): Promise<void>;
  requestAccounts(side: never): Promise<string[]>;
  /** The other wallet's Connect page (Cancel / Connect), no accounts. Absent: connect() opens the account selector, as before. */
  requestConnection?(side: never): Promise<void>;
  revoke(side: never): Promise<void>;
  onConnectionChange(side: never, listener: () => void): () => void;
}

export interface MeritConnectionOptions {
  /** The merit-connect client and the side it reaches ('EXT' or 'WEB_APP'). */
  client: MeritConnectionClient;
  side: string;
  /** Called when the kept lists changed behind this wallet's back (another tab, the worker): the account list reloads. Returns the unsubscribe function. */
  onListChange?(listener: () => void): () => void;
  /** Called when the other wallet took accounts out of this list: a message for the person. Returns the unsubscribe function. */
  onNotice?(listener: (message: string, addresses?: string[]) => void): () => void;
}

const asAccounts = (addresses: string[], id: string): AuthenticatorAccount[] => addresses.map((address) => ({ address, source: id }));

export function withMeritConnection<T extends Authenticator>(base: T, options: MeritConnectionOptions): T {
  const { client } = options;
  const side = options.side as never;
  const overrides: Partial<Authenticator> = {
    async accounts() {
      return asAccounts((await client.handshake(side)).shared, base.id);
    },
    async knownAccounts() {
      return (await client.listAccounts(side)).map((a) => ({ address: a.address, connected: a.connected }));
    },
    async setAccountConnected(address, connected) {
      await client.setAccountConnected(side, address, connected);
    },
    async selectAccounts() {
      try {
        return asAccounts(await client.requestAccounts(side), base.id);
      } catch (error) {
        throw translateProviderError(error, base.id, base.label);
      }
    },
    async disconnect() {
      await client.revoke(side);
    },
    onChange(listener: (change: AuthenticatorChange) => void) {
      // what the wallet itself reports (a chain change, its request on screen) still arrives; its account changes do not: the kept lists decide what the accounts are, and onListChange tells when they changed
      const offBase = base.onChange((change) => {
        if (change !== 'accountsChanged') listener(change);
      });
      const offList = options.onListChange?.(() => listener('accountsChanged'));
      // the link to the other wallet came up (or went down): the lists are made one again
      const offLink = client.onConnectionChange(side, () => listener('accountsChanged'));
      return () => {
        offBase();
        offList?.();
        offLink();
      };
    },
  };
  if (options.onNotice) overrides.onNotice = options.onNotice;
  overrides.meritRemote = true;
  return {
    ...base,
    ...overrides,
    // 2026-11-07 (owner: Connect has its own page, like MetaMask): connecting the wallet is the other wallet's Connect page (Cancel / Connect), no account choice; choosing accounts is selectAccounts (the Add Account(s) button)
    async connect() {
      if (!client.requestConnection) return overrides.selectAccounts!();
      try {
        await client.requestConnection(side);
      } catch (error) {
        throw translateProviderError(error, base.id, base.label);
      }
      return overrides.accounts!();
    },
  } as T;
}
