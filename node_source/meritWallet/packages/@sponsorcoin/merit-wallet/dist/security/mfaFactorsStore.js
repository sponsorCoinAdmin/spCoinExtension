import { assertPasskey } from './passkey';
import { verifyTotp } from './totp';
const KEY = 'merit.mfaFactors.v1';
const OPTIONS_KEY = 'merit.signInOptions.v1';
export function createSecuritySetup(parts) {
    const readJson = (key, fallback) => {
        try {
            const raw = parts.storage()?.getItem(key);
            return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
        }
        catch {
            return fallback;
        }
    };
    const readFactors = () => readJson(KEY, {});
    const readOptions = () => readJson(OPTIONS_KEY, { passkey: false, totp: false });
    const writeOption = (key, on) => {
        parts.storage()?.setItem(OPTIONS_KEY, JSON.stringify({ ...readOptions(), [key]: on }));
    };
    const signIn = {
        options: readOptions,
        setOption: writeOption,
        enrolled: () => {
            const factors = readFactors();
            return { passkey: (factors.passkeys?.length ?? 0) > 0, totp: !!factors.totpSecret };
        },
        verifyTotp: async (code) => {
            const secret = readFactors().totpSecret;
            return !!secret && verifyTotp(secret, code);
        },
        verifyPasskey: async () => {
            const credentials = parts.credentials();
            if (!credentials)
                throw new Error('This device has no passkey store.');
            return assertPasskey((readFactors().passkeys ?? []).map((p) => p.credentialId), credentials);
        },
    };
    return {
        // Setting a step up also switches it on (a passkey added at first run must be used at unlock).
        enrollTotp: async (secret) => {
            parts.storage()?.setItem(KEY, JSON.stringify({ ...readFactors(), totpSecret: secret }));
            writeOption('totp', true);
        },
        enrollPasskey: async (registration) => {
            const current = readFactors();
            parts.storage()?.setItem(KEY, JSON.stringify({ ...current, passkeys: [...(current.passkeys ?? []).filter((p) => p.credentialId !== registration.credentialId), registration] }));
            writeOption('passkey', true);
        },
        get credentials() {
            return parts.credentials();
        },
        accountLabel: parts.accountLabel,
        signIn,
    };
}
