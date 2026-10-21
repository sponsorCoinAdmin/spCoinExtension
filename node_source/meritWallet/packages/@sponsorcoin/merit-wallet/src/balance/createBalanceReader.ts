// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/balance/createBalanceReader.ts
//
// docs/meritMigration.txt row 27. The wallet's balance reader (the `fetchBalance` prop of MeritWallet), written once. The web app had one (lib/wagmi/fetchWalletBalance.ts, over wagmi's public client) and the extension had another
// (src/fetchBalance.ts, over its own viem client): the same two reads, native balance and ERC-20 balanceOf, with ONE difference that is now settled: the web checked that a token address really has contract code on the chain
// and answered 0 when it does not, while the extension called balanceOf straight away and got a failed read (a balance shown as unavailable) for a token that exists on another chain only. The code check is kept (a token that
// is not on this chain holds nothing here), and the address is normalised to lower case first, as the web did.
import { erc20Abi, type Address } from 'viem';

/** The three calls of a viem public client this reader makes (a wagmi public client and a client from createPublicClient both fit). */
export interface BalanceClient {
  getBalance(args: { address: Address }): Promise<bigint>;
  getCode(args: { address: Address }): Promise<string | undefined>;
  readContract(args: { address: Address; abi: typeof erc20Abi; functionName: 'balanceOf'; args: [Address] }): Promise<bigint>;
}

export interface BalanceQuery {
  /** Omitted for the chain's native token. */
  tokenAddress?: string;
  accountAddress: string;
}

const hexAddress = (value: string): string => (/^0x[0-9a-f]{40}$/i.test(value) ? '0x' + value.slice(2).toLowerCase() : value);

/** `getClient` is called for every read (the active chain can change): undefined means this host has no client for the chain, and the balance is unavailable. */
export function createBalanceReader(getClient: () => BalanceClient | undefined) {
  return async ({ tokenAddress: rawTokenAddress, accountAddress: rawAccountAddress }: BalanceQuery): Promise<bigint | undefined> => {
    const tokenAddress = rawTokenAddress ? hexAddress(rawTokenAddress) : rawTokenAddress;
    const accountAddress = hexAddress(rawAccountAddress);
    const client = getClient();
    if (!client) return undefined;
    if (!tokenAddress) return client.getBalance({ address: accountAddress as Address });
    const code = await client.getCode({ address: tokenAddress as Address });
    if (!code || code === '0x') return 0n;
    return client.readContract({ address: tokenAddress as Address, abi: erc20Abi, functionName: 'balanceOf', args: [accountAddress as Address] });
  };
}
