// File: src/standalone/describeApproval.ts
//
// 2026-11-19 -- what the stand-alone approval screen says for one queued request (a transaction, a signature). Pure: no React, no panels, so it is tested under node. The screen itself is useStandaloneApproval.ts.
import { formatEther } from 'viem';
export function describeApproval(info, nativeSymbol) {
    const d = (info.details ?? {});
    if (info.kind === 'transaction') {
        const hasData = !!d.data && d.data !== '0x';
        return {
            title: 'Transaction Request',
            message: info.summary,
            accounts: [
                { role: 'SENDER', address: String(d.from ?? '') },
                ...(d.to ? [{ role: 'RECIPIENT', address: d.to }] : []),
            ],
            amount: d.value !== undefined && !hasData ? { label: 'Amount', value: `${formatEther(BigInt(d.value))} ${nativeSymbol}` } : undefined,
            chainId: d.chainId,
            contractAddress: hasData ? d.to : undefined,
        };
    }
    return {
        title: info.kind === 'sign' ? 'Signature Request' : 'Approval Request',
        message: d.message ? `${info.summary}\n\n${d.message}` : info.summary,
        accounts: d.address ? [{ role: 'SIGNER', address: d.address }] : undefined,
        amount: undefined,
        chainId: d.chainId,
        contractAddress: undefined,
    };
}
