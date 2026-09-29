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
