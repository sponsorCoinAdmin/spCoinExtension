// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/accountDetailHostFromProfile.ts
//
// docs/meritMigration.txt row 14 -- a host that already has an AccountProfileHost (the extension: its vault signs the server's challenge, it owns the accounts it can edit) gets the shared account detail screen from it: the same signing,
// the same "may the wallet edit this account" answer, plus (optionally) the host's way of revealing a key. Data and functions only.
import { processLogoFile } from './logoImage';
import type { ProfileFormData } from './profileForm';
import type { AccountDetailHost } from './AccountDetailScreen';

/** What a host that signs profile saves itself provides (the extension: its vault signs the server's challenge). */
export interface AccountProfileHost {
  /** The hosted app's origin ('' for the same origin). */
  baseUrl: string;
  /** May the wallet sign for this account (is it one of its own)? Others are shown read-only. */
  canEdit(address: string): boolean;
  /** Sign the server's challenge with the account (personal_sign); throw a readable message on rejection. */
  signMessage(address: string, message: string): Promise<string>;
  /** Called after a successful save with what was saved, so the host can update (or drop) its cached copy of the profile. `avatarChanged` is true when a new image was uploaded. */
  onSaved?(address: string, saved: ProfileFormData, avatarChanged: boolean): void;
}

export interface AccountProfileInitial extends Partial<ProfileFormData> {
  avatarSrc?: string;
  recipientNetwork?: number[];
}

export function accountDetailHostFromProfile(
  profile: AccountProfileHost,
  extra: { revealPrivateKey?: AccountDetailHost['revealPrivateKey']; canReveal?: AccountDetailHost['canReveal'] } = {},
): AccountDetailHost {
  return {
    form: {
      baseUrl: profile.baseUrl,
      signerLabel: 'This wallet',
      processLogo: async (file) => new File([await processLogoFile(file)], 'avatar.png', { type: 'image/png' }),
      async signIn(target) {
        if (!profile.canEdit(target)) throw new Error("This account is not one of this wallet's, so it cannot be edited here.");
        return { signerAddress: target, signMessage: (message: string) => profile.signMessage(target, message) };
      },
    },
    connected: false,
    canEdit: (address) => profile.canEdit(address),
    onSaved: profile.onSaved,
    revealPrivateKey: extra.revealPrivateKey,
    canReveal: extra.canReveal,
  };
}
