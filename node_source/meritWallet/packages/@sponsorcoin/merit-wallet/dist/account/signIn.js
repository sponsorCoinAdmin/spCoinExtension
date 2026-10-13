// File: src/account/signIn.ts
//
// 2026-10-12 (docs/design/accountAuthDesign.txt row 13 / 10.6): the one sign-in. The hosted app proves an account is the caller's with a challenge: POST /api/spCoin/auth/nonce { address } answers a nonce and the message to sign, the account signs
// it, POST /api/spCoin/auth/verify { address, nonce, signature } answers a bearer token for the writes (account profile, avatar, exchange-context sync). Four copies of this sequence lived in the web app and this package (the profile client, the
// account form, the web's account panel, the sync sign-in), each with its own wording of the same errors. Who signs is the ACCOUNT's active authenticator (a key kept by the dev server, the extension's vault, the browser vault, MetaMask, a hardware
// wallet): this function only needs "sign this message", so it works for every one of them.
import { AuthenticatorError } from '../auth/authenticator';
async function failure(response, fallback) {
    const payload = (await response.json().catch(() => ({})));
    return new Error(payload.error || payload.details || fallback);
}
/** The challenge, the signature and the token: resolves with the bearer token. */
export async function signInForToken({ baseUrl = '', address, signMessage, fetchImpl }) {
    const f = fetchImpl ?? fetch;
    const nonceResponse = await f(`${baseUrl}/api/spCoin/auth/nonce`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }) });
    if (!nonceResponse.ok) {
        const error = await failure(nonceResponse, `Nonce request failed (HTTP ${nonceResponse.status})`);
        // a server that gave no reason of its own: say what its status means
        const hint = nonceResponse.status === 429 ? 'Too many auth attempts. Please wait and try again.' : nonceResponse.status === 503 ? 'Server auth is not configured.' : '';
        throw new Error(hint && error.message.startsWith('Nonce request failed') ? hint : error.message);
    }
    const noncePayload = (await nonceResponse.json());
    const nonce = String(noncePayload.nonce ?? '');
    const message = String(noncePayload.message ?? '');
    if (!nonce || !message)
        throw new Error('Invalid nonce payload from server');
    const signature = await signMessage(message);
    if (!signature)
        throw new Error('Signature request rejected');
    const verifyResponse = await f(`${baseUrl}/api/spCoin/auth/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, nonce, signature }) });
    if (!verifyResponse.ok)
        throw await failure(verifyResponse, 'Signature verification failed');
    const token = String((await verifyResponse.json()).token ?? '');
    if (!token)
        throw new Error('Missing auth token');
    return token;
}
/** The same sign-in with the account's ACTIVE authenticator signing (the wallet resolves it: the saved choice, the account's source, the app default). A rejection in the wallet reads as one clear message. */
export async function signInWithWallet(wallet, params) {
    const authenticator = await wallet.authenticatorFor({ address: params.address });
    return signInForToken({
        ...params,
        signMessage: async (message) => {
            try {
                return await authenticator.signMessage(params.address, message);
            }
            catch (error) {
                if (error instanceof AuthenticatorError && error.code === 'user_rejected')
                    throw new Error('Signature request rejected');
                throw error;
            }
        },
    });
}
