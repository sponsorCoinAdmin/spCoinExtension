// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/MeritWalletHostView.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, S7 / table row 25) -- the Merit Wallet component mounted with a HOST object instead of a flat prop
// list: every prop the component takes is filed under exactly one section of the host contract (hostContract.ts: layout, uiState, data,
// selection, actions, slots, lock, config), and a host (the web app's MeritWallet.tsx, the extension's sidepanel.ts, later a phone app) hands over
// those sections. This is the same component with the same props; the sections are the contract's shape, checked by the compiler.
'use client';
import React from 'react';
import MeritWallet from './MeritWallet';
/** The flat props the component takes, from a host's sections. Later sections win on a repeated key, but no key belongs to two sections. */
export function meritWalletPropsFromHost(host) {
    return { ...host.layout, ...host.uiState, ...host.data, ...host.selection, ...host.actions, ...host.slots, ...host.lock, ...host.config };
}
export default function MeritWalletHostView({ host }) {
    return React.createElement(MeritWallet, meritWalletPropsFromHost(host));
}
