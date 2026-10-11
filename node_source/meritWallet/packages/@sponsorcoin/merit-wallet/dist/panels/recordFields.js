// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/recordFields.ts
//
// 2026-09-22, real migration — the general RecordField/toDisplayString
// shape plus the specific MeritTabInfo/getMeritInfoMetaData pair, promoted
// from the web app's real lib/utils/recordFields.ts. That file also has
// several other getXMetaData functions (getAccountMetaData, etc.) that were
// first left behind until their panels migrated; as of 2026-10-07 they are all
// here (see the note further down), and the web file is a re-export.
export function toDisplayString(v) {
    if (v === null || v === undefined)
        return '';
    if (typeof v === 'bigint')
        return v.toString();
    return String(v).trim();
}
export function getMeritInfoMetaData(info) {
    const tabs = Array.isArray(info?.tabs) ? info.tabs : [];
    return [
        { label: 'Name', value: toDisplayString(info?.name), kind: 'text' },
        { label: 'Website', value: toDisplayString(info?.website), kind: 'url' },
        ...tabs.map((tab) => ({
            label: toDisplayString(tab?.key).toUpperCase(),
            value: toDisplayString(tab?.label),
            kind: 'text',
        })),
    ];
}
// 2026-10-07 (docs/migrations.txt row 1.2) — everything below was moved here from the web app's
// lib/utils/recordFields.ts (pure data builders, no web dependencies). Standardized field
// extraction for the "record" shapes shown in the detail panels (token, network, account, spCoin
// contract) and the debug Exchange Context tree, so a record looks identical wherever it is
// displayed — same fields, same order, same fallback for blanks. The web file is now a re-export.
/** TokenContract-shaped: has a string address plus at least one token-only field. */
export function isTokenContractLike(v) {
    return (!!v &&
        typeof v === 'object' &&
        typeof v.address === 'string' &&
        ('symbol' in v || 'decimals' in v || 'chainId' in v || 'totalSupply' in v));
}
/** spCoinAccount-shaped: has a string address plus the account-only fields. */
export function isSpCoinAccountLike(v) {
    return !!v && typeof v === 'object' && typeof v.address === 'string' && 'type' in v && 'status' in v;
}
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
export function isSpCoinContractLike(v) {
    return !!v && typeof v === 'object' && typeof v.owner === 'string' && 'totalSypply' in v;
}
export function getTokenMetaData(token) {
    return [
        { label: 'Name', value: toDisplayString(token?.name), kind: 'text' },
        { label: 'Symbol', value: toDisplayString(token?.symbol), kind: 'text' },
        { label: 'Decimals', value: toDisplayString(token?.decimals), kind: 'text' },
        { label: 'Total Supply', value: toDisplayString(token?.totalSupply), kind: 'text' },
        { label: 'Address', value: toDisplayString(token?.address), kind: 'address' },
        { label: 'Website', value: toDisplayString(token?.website), kind: 'url' },
        { label: 'Logo URL', value: toDisplayString(token?.logoURL), kind: 'url' },
        { label: 'Description', value: toDisplayString(token?.description), kind: 'text' },
        { label: 'Amount', value: toDisplayString(token?.amount), kind: 'text' },
    ];
}
/**
 * NetworkElement-shaped, plus the optional extra fields NetworkPanel/index.tsx
 * self-heals in from the network's own info.json (public/assets/blockchains/
 * ${chainId}/info.json) — website/description aren't part of NetworkElement
 * itself (lib/structure/types.ts), same way TokenPanel augments a bare
 * TokenContract with fetched record fields before building its rows.
 */
export function getNetworkMetaData(network) {
    return [
        { label: 'Name', value: toDisplayString(network?.name), kind: 'text' },
        { label: 'Symbol', value: toDisplayString(network?.symbol), kind: 'text' },
        { label: 'Chain ID', value: toDisplayString(network?.chainId), kind: 'text' },
        { label: 'App Chain ID', value: toDisplayString(network?.appChainId), kind: 'text' },
        { label: 'Connected', value: network?.connected ? 'Yes' : 'No', kind: 'text' },
        { label: 'RPC URL', value: toDisplayString(network?.rpcUrl), kind: 'url' },
        { label: 'Explorer URL', value: toDisplayString(network?.url), kind: 'url' },
        { label: 'Website', value: toDisplayString(network?.website), kind: 'url' },
        { label: 'Logo URL', value: toDisplayString(network?.logoURL), kind: 'url' },
        { label: 'Description', value: toDisplayString(network?.description), kind: 'text' },
    ];
}
// 2026-09-22, real migration — MeritTabInfo/getMeritInfoMetaData moved to
// @sponsorcoin/spcoin-panels' own recordFields.ts (MeritInfoPanel's real
// migration). Re-export shim, zero behavior change. toDisplayString/
// RecordField/RecordFieldKind above deliberately stay local — every other
// function in this file (getTokenMetaData/getNetworkMetaData/
// getAccountMetaData/etc.) still depends on them and isn't migrated yet;
// a small, harmless duplication of those 3 general-purpose pieces in the
// package rather than a bigger, unrelated refactor of this whole file.
export function getAccountMetaData(account) {
    return [
        { label: 'Name', value: toDisplayString(account?.name), kind: 'text' },
        { label: 'Symbol', value: toDisplayString(account?.symbol), kind: 'text' },
        { label: 'Address', value: toDisplayString(account?.address), kind: 'address' },
        { label: 'Type', value: toDisplayString(account?.type), kind: 'text' },
        { label: 'Status', value: toDisplayString(account?.status), kind: 'text' },
        { label: 'Website', value: toDisplayString(account?.website), kind: 'url' },
        { label: 'Logo URL', value: toDisplayString(account?.logoURL), kind: 'url' },
        { label: 'Description', value: toDisplayString(account?.description), kind: 'text' },
        { label: 'Balance', value: toDisplayString(account?.balance), kind: 'text' },
    ];
}
function formatRateRange(range) {
    return Array.isArray(range) ? `${toDisplayString(range[0])}–${toDisplayString(range[1])}` : '';
}
export function getSpCoinContractMetaData(contract) {
    return [
        { label: 'Name', value: toDisplayString(contract?.name), kind: 'text' },
        { label: 'Symbol', value: toDisplayString(contract?.symbol), kind: 'text' },
        { label: 'Decimals', value: toDisplayString(contract?.decimals), kind: 'text' },
        { label: 'Address', value: toDisplayString(contract?.address), kind: 'address' },
        { label: 'Owner', value: toDisplayString(contract?.owner), kind: 'address' },
        { label: 'Version', value: toDisplayString(contract?.version), kind: 'text' },
        { label: 'Total Supply', value: toDisplayString(contract?.totalSypply), kind: 'text' },
        { label: 'Inflation Rate', value: toDisplayString(contract?.inflationRate), kind: 'text' },
        { label: 'Recipient Rate Range', value: formatRateRange(contract?.recipientRateRange), kind: 'text' },
        { label: 'Agent Rate Range', value: formatRateRange(contract?.agentRateRange), kind: 'text' },
        { label: 'Recipient Rate Increment', value: toDisplayString(contract?.recipientRateIncrement), kind: 'text' },
        { label: 'Agent Rate Increment', value: toDisplayString(contract?.agentRateIncrement), kind: 'text' },
    ];
}
/**
 * Picks the right schema for whatever record shape `v` matches, else undefined.
 * spCoinContract is checked first — it's the most specific shape (only it has
 * `totalSypply`); spCoinAccount next — it requires both `type` and `status`,
 * which TokenContract never has; TokenContract's check (`symbol` present)
 * would otherwise also match accounts, since accounts have a `symbol` field
 * too.
 */
export function getRecordFields(v) {
    if (isSpCoinContractLike(v))
        return getSpCoinContractMetaData(v);
    if (isSpCoinAccountLike(v))
        return getAccountMetaData(v);
    if (isTokenContractLike(v))
        return getTokenMetaData(v);
    return undefined;
}
