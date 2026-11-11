const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
/** Every backend that lists the address, connected or not (knownAccounts when it has it). */
export async function holdersOf(registry, address) {
    const holders = [];
    for (const authenticator of registry.list()) {
        try {
            const known = authenticator.knownAccounts ? await authenticator.knownAccounts() : undefined;
            const listed = known ? known.map((a) => a.address) : (await authenticator.accounts()).map((a) => a.address);
            if (listed.some((a) => same(a, address)))
                holders.push(authenticator);
        }
        catch {
            /* a wallet that cannot be asked now holds nothing for this purpose */
        }
    }
    return holders;
}
/** The row opened (groupId) decides which holder the removal is about; omitted, the local (key-keeping) holder wins. */
export function removalTarget(holders, groupId) {
    const opened = groupId ? holders.find((a) => a.id === groupId) : undefined;
    return { opened, isLocal: opened ? !!opened.vault : holders.some((a) => !!a.vault) };
}
