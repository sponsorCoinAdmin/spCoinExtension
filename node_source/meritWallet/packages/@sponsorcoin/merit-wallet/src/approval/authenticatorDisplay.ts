// File: src/approval/authenticatorDisplay.ts
//
// 2026-11-23 (consolidation): what a trade's display becomes when the vault's authenticator is asked to sign it. The browser wallet, the stand-alone wallet and the extension each carried their own copy of this field-by-field mapping (and each had to be
// taught every new field by hand); the one here is the single list. A field the approval screen does not know is simply not sent.
import type { AuthenticatorDisplay } from '../auth/authenticator';

/** The loose shape of a TradeExecutor display (the typed part is spcoin-common's TradeExecutorDisplayMeta; the rest are the extra fields the shared swap, claim and stake flows add). */
export interface TradeDisplayInput {
  title?: string;
  label?: string;
  contractAddress?: string;
  accounts?: unknown;
  tokens?: unknown;
  amount?: { label: string; value: string };
  [key: string]: unknown;
}

export function authenticatorDisplayOf(display: TradeDisplayInput | undefined): AuthenticatorDisplay {
  return {
    title: display?.title ?? display?.label ?? 'Transaction',
    message: display?.label,
    contractAddress: display?.contractAddress,
    contractSymbol: display?.contractSymbol as string | undefined,
    contractName: display?.contractName as string | undefined,
    swapMethod: display?.swapMethod as string | undefined,
    swapStep: display?.swapStep as boolean | undefined,
    method: display?.method as string | undefined,
    accounts: display?.accounts as AuthenticatorDisplay['accounts'],
    tokens: display?.tokens as AuthenticatorDisplay['tokens'],
    amount: display?.amount ? { label: display.amount.label, value: display.amount.value } : undefined,
    amounts: display?.amounts as AuthenticatorDisplay['amounts'],
    pills: display?.pills as AuthenticatorDisplay['pills'],
  };
}
