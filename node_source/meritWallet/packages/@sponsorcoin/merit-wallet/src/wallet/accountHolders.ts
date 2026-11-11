// File: src/wallet/accountHolders.ts
//
// 2026-11-10 (docs/design/removeAccountPlan.txt row 3): who HOLDS an account, and which of the holders a removal is about. Written once: the wallet's removeAccount and the Account Details screen (account/accountSource.ts) both read it,
// so the screen never has to ask which wallet an account belongs to. A wallet that cannot be asked now holds nothing for this purpose.
import type { Authenticator } from '../auth/authenticator';
import type { AuthenticatorRegistry } from '../auth/resolve';

const same = (a: string | undefined, b: string | undefined) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** Every backend that lists the address, connected or not (knownAccounts when it has it). */
export async function holdersOf(registry: AuthenticatorRegistry, address: string): Promise<Authenticator[]> {
  const holders: Authenticator[] = [];
  for (const authenticator of registry.list()) {
    try {
      const known = authenticator.knownAccounts ? await authenticator.knownAccounts() : undefined;
      const listed = known ? known.map((a) => a.address) : (await authenticator.accounts()).map((a) => a.address);
      if (listed.some((a) => same(a, address))) holders.push(authenticator);
    } catch {
      /* a wallet that cannot be asked now holds nothing for this purpose */
    }
  }
  return holders;
}

/** The row opened (groupId) decides which holder the removal is about; omitted, the local (key-keeping) holder wins. */
export function removalTarget(holders: Authenticator[], groupId?: string): { opened?: Authenticator; isLocal: boolean } {
  const opened = groupId ? holders.find((a) => a.id === groupId) : undefined;
  return { opened, isLocal: opened ? !!opened.vault : holders.some((a) => !!a.vault) };
}
