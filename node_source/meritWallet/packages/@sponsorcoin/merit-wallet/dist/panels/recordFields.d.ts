export type RecordFieldKind = 'text' | 'address' | 'url';
export interface RecordField {
    label: string;
    value: string;
    kind: RecordFieldKind;
}
export declare function toDisplayString(v: unknown): string;
export interface MeritTabInfo {
    /** Short tab id, e.g. "SWAP" — used as this row's own label, uppercased. */
    key: string;
    /** One-line summary shown as this row's value, e.g. "Exchange Tokens". */
    label: string;
    /** Slightly longer explanation — not shown as its own row; MeritInfoPanel folds this into the Description row's per-tab bullet list instead. */
    detail: string;
}
export declare function getMeritInfoMetaData(info: any): RecordField[];
/** TokenContract-shaped: has a string address plus at least one token-only field. */
export declare function isTokenContractLike(v: any): boolean;
/** spCoinAccount-shaped: has a string address plus the account-only fields. */
export declare function isSpCoinAccountLike(v: any): boolean;
/**
 * ExchangeContext.settings.spCoinContract-shaped: the on-chain governance/
 * rate metadata block, not a tradeable TokenContract. Checked ahead of
 * isTokenContractLike below — now that this shape carries its own `address`
 * (2026-09-07, on request) plus `symbol`, it would otherwise also match
 * TokenContract's looser check and render via getTokenMetaData, silently
 * dropping owner/version/totalSypply/inflationRate/rate-range/increment from
 * the debug tree. 'totalSypply' (the real, if misspelled, field name) is the
 * distinguishing field — no TokenContract or spCoinAccount ever has it.
 */
export declare function isSpCoinContractLike(v: any): boolean;
export declare function getTokenMetaData(token: any): RecordField[];
/**
 * NetworkElement-shaped, plus the optional extra fields NetworkPanel/index.tsx
 * self-heals in from the network's own info.json (public/assets/blockchains/
 * ${chainId}/info.json) — website/description aren't part of NetworkElement
 * itself (lib/structure/types.ts), same way TokenPanel augments a bare
 * TokenContract with fetched record fields before building its rows.
 */
export declare function getNetworkMetaData(network: any): RecordField[];
export declare function getAccountMetaData(account: any): RecordField[];
export declare function getSpCoinContractMetaData(contract: any): RecordField[];
/**
 * Picks the right schema for whatever record shape `v` matches, else undefined.
 * spCoinContract is checked first — it's the most specific shape (only it has
 * `totalSypply`); spCoinAccount next — it requires both `type` and `status`,
 * which TokenContract never has; TokenContract's check (`symbol` present)
 * would otherwise also match accounts, since accounts have a `symbol` field
 * too.
 */
export declare function getRecordFields(v: any): RecordField[] | undefined;
