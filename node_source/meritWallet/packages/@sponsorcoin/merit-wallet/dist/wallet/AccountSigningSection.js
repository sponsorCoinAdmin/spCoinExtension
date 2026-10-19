// File: src/wallet/AccountSigningSection.tsx
//
// 2026-10-12 (docs/design/accountAuthDesign.txt row 15): "Who signs" for the active account, in the Config tab of every host. Lists the holders of the account (src/wallet/accountSigning.ts), marks the one that signs now, says in words when it cannot be
// reached, and switches with one click when the account has more than one holder (5.6: instant, nothing copied or lost). An account with one holder just says who signs; with no account it says so.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { configSectionStyle } from '@sponsorcoin/spcoin-common/styles';
import { useCallback, useEffect, useState } from 'react';
import { SmallYellowButton } from '@sponsorcoin/spcoin-panels';
import { chooseSigner, readSigningChoices } from './accountSigning';
const STATE_TEXT = { ready: '', locked: 'locked', unreachable: 'not reachable' };
export default function AccountSigningSection({ wallet, address }) {
    const [choices, setChoices] = useState(undefined);
    const [error, setError] = useState('');
    const load = useCallback(async () => {
        if (!address)
            return setChoices(undefined);
        setChoices(await readSigningChoices(wallet, address).catch(() => undefined));
    }, [wallet, address]);
    useEffect(() => {
        void load();
        return wallet.onChange(() => void load());
    }, [wallet, load]);
    if (!address)
        return _jsx("p", { style: configSectionStyle.note, children: "Select an account to see who signs for it." });
    if (!choices)
        return _jsx("p", { style: configSectionStyle.note, children: "Reading who signs for this account..." });
    const choose = async (id) => {
        setError('');
        try {
            setChoices(await chooseSigner(wallet, address, id));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'That did not work.');
        }
    };
    const active = choices.holders.find((h) => h.isActive);
    return (_jsxs("div", { style: configSectionStyle.column(8), children: [_jsxs("p", { style: configSectionStyle.note, children: [active ? `${active.label} signs for this account${active.where ? ` (its keys are on ${active.where})` : ''}.` : 'No wallet holds this account here.', !choices.savedId && active ? ' This is the app default; you have not chosen one.' : ''] }), choices.holders.length > 1 ? (_jsx("div", { role: "radiogroup", "aria-label": "Who signs", style: configSectionStyle.radioGroup, children: choices.holders.map((holder) => (_jsxs("label", { style: configSectionStyle.radioRow, children: [_jsx("input", { type: "radio", name: "spcoin-account-signer", checked: holder.isActive, onChange: () => void choose(holder.id) }), _jsx("span", { children: holder.label }), holder.where ? _jsxs("span", { style: configSectionStyle.muted, children: ["(", holder.where, ")"] }) : null, holder.state !== 'ready' ? _jsx("span", { style: configSectionStyle.warn, children: STATE_TEXT[holder.state] }) : null] }, holder.id))) })) : null, choices.warning ? _jsx("p", { style: configSectionStyle.bad, children: choices.warning }) : null, error ? _jsx("p", { style: configSectionStyle.bad, children: error }) : null, choices.savedId ? (_jsx("div", { children: _jsx(SmallYellowButton, { onClick: () => void choose(undefined), children: "Use the app default" }) })) : null] }));
}
