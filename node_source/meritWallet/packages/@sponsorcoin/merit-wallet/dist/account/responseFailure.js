// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/responseFailure.ts
//
// docs/meritMigration.txt row 31: the Error for a refused request, from the reason the server gave (error, then details) or the caller's fallback. The profile client and the sign-in each had a copy.
export async function responseFailure(response, fallback) {
    const payload = (await response.json().catch(() => ({})));
    return new Error(payload.error || payload.details || fallback);
}
