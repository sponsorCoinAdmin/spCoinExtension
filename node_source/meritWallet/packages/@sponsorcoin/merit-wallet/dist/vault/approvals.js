// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/vault/approvals.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E3) -- the approval queue, MetaMask's ApprovalController shape: anything that wants a signature
// (a message, a transaction) is a request that WAITS; the wallet UI lists the pending requests and the user approves or rejects each one; only an
// approval releases the work. There is no "auto-approve" here (unlike the web app's default): every request is explicit.
//
// Pure TypeScript with no storage: pending requests live in memory (as in MetaMask, a host restart drops them and their callers see a rejection).
export class ApprovalRejectedError extends Error {
    constructor(reason) {
        super(reason || 'The request was rejected.');
        this.name = 'ApprovalRejectedError';
    }
}
export class ApprovalController {
    constructor(now = () => Date.now()) {
        this.now = now;
        this.pending = new Map();
        this.listeners = new Set();
        this.counter = 0;
    }
    /**
     * Queue a request. The returned promise settles only after the user decides: approve runs `run` (the signing or sending) and resolves with its
     * result, or rejects with its error; reject rejects with ApprovalRejectedError. `run` is not called before approval.
     */
    request(info, run) {
        const id = `approval-${++this.counter}-${Math.random().toString(36).slice(2, 10)}`;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { info: { ...info, id, createdAt: this.now() }, run, resolve: resolve, reject });
            this.emit();
        });
    }
    list() {
        return Array.from(this.pending.values()).map((p) => p.info);
    }
    /** Approve: run the work. Returns once the work has finished (success or failure is also delivered to the original caller). */
    async approve(id) {
        const p = this.take(id);
        try {
            p.resolve(await p.run());
        }
        catch (error) {
            p.reject(error);
        }
    }
    reject(id, reason) {
        this.take(id).reject(new ApprovalRejectedError(reason));
    }
    /** Reject everything pending (the wallet locked, or the host is shutting down). */
    rejectAll(reason = 'The wallet was locked.') {
        for (const id of Array.from(this.pending.keys()))
            this.reject(id, reason);
    }
    onChange(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    take(id) {
        const p = this.pending.get(id);
        if (!p)
            throw new Error('No such pending request.');
        this.pending.delete(id);
        this.emit();
        return p;
    }
    emit() {
        for (const l of Array.from(this.listeners))
            l();
    }
}
