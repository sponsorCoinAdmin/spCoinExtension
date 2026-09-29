// File: node_source/spCoinLib/packages/@sponsorcoin/spcoin-lib/src/utils.ts
//
// 2026-09-11 — converted from hand-written utils.js/utils.d.ts (real
// production package, 20+ consumers app-wide, all via the
// '@sponsorcoin/spcoin-lib/utils' subpath — see spcoinPackagesDesign.md)
// to real TypeScript with a generated build, matching the sibling
// packages' pattern (spcoin-common/spcoin-panels). Same public contract:
// `stringifyBigInt` unchanged, byte-identical behavior. `truncateMiddle`
// is new — previously duplicated inline wherever a portable component
// needed it (see AssetSelectDropDown.tsx's own comment) because this
// package had nowhere ready to receive it; now it has a real home.

export const stringifyBigInt = (obj: unknown): string => {
  return JSON.stringify(
    obj,
    (_, v) => (typeof v === 'bigint' ? v.toString() : v),
    2,
  );
};

/**
 * Truncates a long address by keeping `start` chars at the front and `end`
 * chars at the back, joined with "...". Safe to call on any string.
 */
export const truncateMiddle = (addr: string, start = 10, end = 8): string => {
  return addr.length > start + end + 3
    ? `${addr.slice(0, start)}...${addr.slice(-end)}`
    : addr;
};
