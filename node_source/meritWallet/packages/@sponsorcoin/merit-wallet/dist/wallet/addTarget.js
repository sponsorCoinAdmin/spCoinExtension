/** How long a wallet may take to say whether it can be reached before the screen goes on without it (a slow wallet must not hold the screen back). */
export const TARGET_STATUS_TIMEOUT_MS = 2000;
const withTimeout = (promise, ms) => new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); resolve(undefined); });
});
/**
 * The wallets the Add screen can add to, and which one it starts on. `only` limits the check to the wallets a host can really add keys to (the others are not even asked); each wallet is asked at the same time and
 * one that does not answer within TARGET_STATUS_TIMEOUT_MS is left out, so a slow one never holds the screen back.
 */
export async function readAddTargets(wallet, activeAddress, only) {
    const candidates = wallet.backends().filter((backend) => backend.keepsKeys && (!only || only.includes(backend.id)));
    const answers = await Promise.all(candidates.map((backend) => withTimeout(Promise.resolve(wallet.registry.get(backend.id)?.status()), TARGET_STATUS_TIMEOUT_MS)));
    const targets = [];
    candidates.forEach((backend, i) => {
        if (answers[i]?.available)
            targets.push({ id: backend.id, name: backend.name, features: backend.features });
    });
    const active = activeAddress ? wallet.backendIdFor(activeAddress) : undefined;
    const defaultId = active && targets.some((t) => t.id === active) ? active : targets[0]?.id;
    return { targets, defaultId };
}
/** The reasons, in the target's own name, why an entry that adds keys cannot be used; an entry the target can do has none. */
export function addEntryReasons(target) {
    if (!target)
        return {};
    const reasons = {};
    if (!target.features.addAccount)
        reasons.createAccount = `${target.name} cannot create accounts here.`;
    if (!target.features.importKey)
        reasons.importAccount = `${target.name} cannot import a private key: its keys are never typed in.`;
    if (!target.features.importPhrase)
        reasons.importWallet = `${target.name} cannot import a recovery phrase.`;
    return reasons;
}
