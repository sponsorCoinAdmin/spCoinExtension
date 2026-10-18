// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/accountDetailHostFromProfile.ts
//
// docs/meritMigration.txt row 14 -- a host that already has an AccountProfileHost (the extension: its vault signs the server's challenge, it owns the accounts it can edit) gets the shared account detail screen from it: the same signing,
// the same "may the wallet edit this account" answer, plus (optionally) the host's way of revealing a key. Data and functions only.
import { processLogoFile } from './logoImage';
export function accountDetailHostFromProfile(profile, extra = {}) {
    return {
        form: {
            baseUrl: profile.baseUrl,
            signerLabel: 'This wallet',
            processLogo: async (file) => new File([await processLogoFile(file)], 'avatar.png', { type: 'image/png' }),
            async signIn(target) {
                if (!profile.canEdit(target))
                    throw new Error("This account is not one of this wallet's, so it cannot be edited here.");
                return { signerAddress: target, signMessage: (message) => profile.signMessage(target, message) };
            },
        },
        connected: false,
        canEdit: (address) => profile.canEdit(address),
        onSaved: profile.onSaved,
        revealPrivateKey: extra.revealPrivateKey,
        canReveal: extra.canReveal,
    };
}
