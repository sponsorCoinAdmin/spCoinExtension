import type { WalletSecurityApi } from '../WalletSecuritySection';
import type { Wallet } from './wallet';
/** The API for the active account, or undefined when its backend can reveal neither the key nor the phrase (then there is nothing to show). */
export declare function createWalletSecurityApi(wallet: Wallet, activeAddress: string | undefined): WalletSecurityApi | undefined;
