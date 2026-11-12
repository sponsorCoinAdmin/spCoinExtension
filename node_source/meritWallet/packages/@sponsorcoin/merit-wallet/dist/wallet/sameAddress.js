// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/wallet/sameAddress.ts
//
// 2026-11-12 (cleanup): "are these two addresses the same", case-insensitive, false when either is missing. Six files each carried their own copy of this one line; this is the one.
export const sameAddress = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
