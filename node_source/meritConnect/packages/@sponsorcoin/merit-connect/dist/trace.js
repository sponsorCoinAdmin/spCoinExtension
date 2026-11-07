// File: src/trace.ts
//
// 2026-11-06 (docs/design/meritConnectDesign.txt, section 8): the ONE trace channel. Every step of the protocol emits `merit-connect:<event>` with a detail that carries the request id (`rid`), through a function the host
// supplies, so the lines land in the host's own bug button and log. A request that was DROPPED is an id with no later event; a MISMATCHED one is a `refused` event that names the sender.
/** Wrap the host's trace function. A sink that throws must never break a wallet request, so its failure is dropped here, and ONLY here. */
export function createTrace(sink) {
    return (event, detail = {}) => {
        if (!sink)
            return;
        try {
            sink(`merit-connect:${event}`, detail);
        }
        catch {
            /* a broken log sink is not a protocol failure */
        }
    };
}
