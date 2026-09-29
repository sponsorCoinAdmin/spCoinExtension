// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/recordFields.ts
//
// 2026-09-22, real migration — the general RecordField/toDisplayString
// shape plus the specific MeritTabInfo/getMeritInfoMetaData pair, promoted
// from the web app's real lib/utils/recordFields.ts. That file also has
// several other getXMetaData functions (getAccountMetaData, etc.) tied to
// panels that aren't migrated yet — deliberately NOT brought over here to
// avoid dragging in unrelated, not-yet-relevant code; add to this file as
// each of those panels gets its own real migration, same incremental
// "populate the engine" pattern already used elsewhere.
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
