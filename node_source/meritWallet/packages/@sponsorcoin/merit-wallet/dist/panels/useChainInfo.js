// File: src/panels/useChainInfo.ts
//
// 2026-11-03 (owner request): the network pill in the wallet header reads "$symbol | $name" over the chain id, and those two come from the chain's own meta, public/assets/blockchains/<chainId>/info.json
// ("ETH | Ethereum", "HH | Hardhat"). Fetched once per chain and kept; the list row's own symbol and name are the fallback until it lands (or when a chain has no info.json).
'use client';
import { useEffect, useState } from 'react';
const cache = new Map();
export function useChainInfo(chainId, baseUrl = '') {
    const key = chainId === undefined || chainId === '' ? '' : String(chainId);
    const [, bump] = useState(0);
    useEffect(() => {
        if (!key || cache.has(key))
            return undefined;
        let cancelled = false;
        cache.set(key, null);
        fetch(`${baseUrl}/assets/blockchains/${key}/info.json`)
            .then((response) => (response.ok ? response.json() : null))
            .then((json) => {
            if (json)
                cache.set(key, { name: typeof json.name === 'string' ? json.name : undefined, symbol: typeof json.symbol === 'string' ? json.symbol : undefined });
        })
            .catch(() => undefined)
            .finally(() => { if (!cancelled)
            bump((n) => n + 1); });
        return () => { cancelled = true; };
    }, [key, baseUrl]);
    return key ? cache.get(key) ?? undefined : undefined;
}
