import type { AuthenticatorId } from '../auth/authenticator';
import type { Wallet } from './wallet';
export type HolderState = 'ready' | 'locked' | 'unreachable';
export interface SigningHolder {
    id: AuthenticatorId;
    label: string;
    /** Where its keys live ('this device', 'the dev server') or empty for a signing-only holder. */
    where: string;
    state: HolderState;
    isActive: boolean;
}
export interface SigningChoices {
    address: string;
    holders: SigningHolder[];
    /** The authenticator that signs for the account now (the saved choice, else the account's source, else the app default). */
    activeId: AuthenticatorId | undefined;
    /** The user's saved choice, or undefined when the app default decides. */
    savedId: AuthenticatorId | undefined;
    /** More than one holder has the account: there is something to switch. */
    canSwitch: boolean;
    /** One sentence when the active holder cannot sign right now, else ''. */
    warning: string;
}
/** The words for an active holder that cannot sign: one message in every host. */
export declare function signingWarning(holder: Pick<SigningHolder, 'label' | 'state'> | undefined, others: number): string;
/** Which holders have this account, which one signs, and whether it can be reached. */
export declare function readSigningChoices(wallet: Wallet, address: string): Promise<SigningChoices>;
/** Make `id` the authenticator that signs for the account (instant; nothing is copied or lost). Resolves with the choices as they are afterwards. */
export declare function chooseSigner(wallet: Wallet, address: string, id: AuthenticatorId | undefined): Promise<SigningChoices>;
