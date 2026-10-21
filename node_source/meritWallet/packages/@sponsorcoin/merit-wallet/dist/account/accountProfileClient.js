// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/accountProfileClient.ts
//
// 2026-10-09 -- saving an account's public profile (name, symbol, email, website, description, avatar) with the hosted app, written once for both hosts. It is the
// sequence the web app's useCreateAccountForm.handleSubmit runs, minus its signer selection (the host passes `signMessage`):
//   1. POST /api/spCoin/auth/nonce  { address }                 -> { nonce, message }
//   2. the account signs `message` (personal_sign)              -> signature
//   3. POST /api/spCoin/auth/verify { address, nonce, signature } -> { token }
//   4. POST (new) or PUT (existing) /api/spCoin/accounts/<address>  with the fields, Authorization: Bearer <token>
//   5. PUT /api/spCoin/accounts/<address>?target=logo with the image as multipart form data (only when a new image was chosen)
// `baseUrl` is the hosted app's origin ('' for the same origin, as in the web app). A signer that is neither the target account nor a configured owner is refused by
// the server, which is how the web app enforces "you can only edit your own account". No host imports; tested with a fake fetch (test/accountProfile.test.mjs).
import { trimProfile, validateProfile } from './profileForm';
import { signInForToken } from './signIn';
import { responseFailure } from './responseFailure';
function normalize(address) {
    return `0x${String(address).replace(/^0[xX]/, '').toLowerCase()}`;
}
export async function saveAccountProfile(params) {
    const f = params.fetchImpl ?? fetch;
    const fields = trimProfile(params.fields);
    const errors = validateProfile(fields);
    const firstError = Object.values(errors)[0];
    if (firstError)
        throw new Error(firstError);
    const address = normalize(params.address);
    const saveFields = params.saveFields ?? true;
    if (!saveFields && !params.logo)
        return;
    const token = await signInForToken({ baseUrl: params.baseUrl, address, signMessage: params.signMessage, fetchImpl: f });
    const accountUrl = `${params.baseUrl}/api/spCoin/accounts/${encodeURIComponent(address)}`;
    if (saveFields) {
        const response = await f(accountUrl, {
            method: params.exists ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ address: params.address.trim(), ...fields, recipientNetwork: params.recipientNetwork ?? [] }),
        });
        if (!response.ok)
            throw await responseFailure(response, 'Failed to save account.json');
    }
    if (params.logo) {
        const form = new FormData();
        form.append('file', params.logo, 'avatar.png');
        const response = await f(`${accountUrl}?target=logo`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: form });
        if (!response.ok)
            throw await responseFailure(response, 'Failed to save avatar.png');
    }
}
