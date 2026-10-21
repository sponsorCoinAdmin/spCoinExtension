// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/sync/syncToken.ts
//
// docs/meritMigration.txt row 32. The policy for the token that authorizes pushing the ExchangeContext to the sync server, written once (it was the web app's lib/structure/exchangeContextCore/client/ensureSyncToken.ts):
// ONE token per active account, kept until 90 s before it expires and then replaced; two callers asking at the same time share one mint; when sync is turned off the token and its refresh are dropped and asking fails;
// after a mint a refresh is scheduled for 90 s before expiry and a failed refresh just forgets the token (the next caller mints again). The token's expiry is read from its own text (four dot-separated parts, the second the
// expiry in milliseconds in base 36).
// What a host supplies (the web app: its signer choice, its Config sync settings and its sync route): how to get a signer for the sync authorization, whether sync is disabled or must ask for the password, and how to sign in.
// Tests pass `now` and the timer functions; a host passes nothing.
/** A token is replaced when it has less than this long left. */
export const REFRESH_LEAD_MS = 90000;
/** The expiry (ms since the epoch) written into a token, or null when the text is not a token. */
export function parseTokenExpiresAt(token) {
    const parts = token.split('.');
    if (parts.length !== 4)
        return null;
    const expiresAt = Number.parseInt(parts[1], 36);
    return Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : null;
}
export function createSyncTokenProvider(host) {
    const now = host.now ?? (() => Date.now());
    const setTimer = host.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    const clearTimer = host.clearTimer ?? ((handle) => clearTimeout(handle));
    let cached = null;
    let refreshTimer = null;
    let inFlight = null;
    function clearScheduledRefresh() {
        if (refreshTimer !== null) {
            clearTimer(refreshTimer);
            refreshTimer = null;
        }
    }
    async function mintToken(params) {
        const syncAuthRequired = host.isSyncAuthorizationRequired();
        const signer = await host.getSigner({
            chainId: params.chainId,
            activeAccountAddress: params.activeAccountAddress,
            rpcUrl: params.rpcUrl,
            label: 'Sync authorization',
            title: 'Authorize Sync',
            skipMandatoryApprovalGate: true,
            forceRequirePassword: syncAuthRequired,
            interactive: syncAuthRequired || params.userInitiated === true,
            background: params.userInitiated !== true,
        });
        const token = await host.signInForSync(params.activeAccountAddress, (message) => signer.signMessage(message));
        const expiresAt = parseTokenExpiresAt(token);
        if (expiresAt === null) {
            throw new Error('ensureSyncToken: minted token has an unrecognized shape');
        }
        return { address: params.activeAccountAddress.toLowerCase(), token, expiresAt };
    }
    function scheduleRefresh(params, expiresAt) {
        clearScheduledRefresh();
        const delay = Math.max(0, expiresAt - now() - REFRESH_LEAD_MS);
        refreshTimer = setTimer(() => {
            mintToken(params)
                .then((next) => {
                cached = next;
                scheduleRefresh(params, next.expiresAt);
            })
                .catch(() => {
                cached = null;
            });
        }, delay);
    }
    async function ensureSyncToken(params) {
        if (host.isSyncDisabled()) {
            clearScheduledRefresh();
            cached = null;
            throw new Error('ensureSyncToken: sync is disabled (Disable Sync checkbox, Config tab).');
        }
        const normalized = params.activeAccountAddress.toLowerCase();
        if (cached?.address === normalized && cached.expiresAt - now() > REFRESH_LEAD_MS) {
            return cached.token;
        }
        if (inFlight?.address === normalized)
            return inFlight.promise;
        const promise = mintToken(params)
            .then((minted) => {
            cached = minted;
            scheduleRefresh(params, minted.expiresAt);
            return minted.token;
        })
            .finally(() => {
            if (inFlight?.promise === promise)
                inFlight = null;
        });
        inFlight = { address: normalized, promise };
        return promise;
    }
    function reset() {
        cached = null;
        inFlight = null;
        clearScheduledRefresh();
    }
    return { ensureSyncToken, reset };
}
