// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/vault/approvals.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E3) -- the approval queue, MetaMask's ApprovalController shape: anything that wants a signature
// (a message, a transaction) is a request that WAITS; the wallet UI lists the pending requests and the user approves or rejects each one; only an
// approval releases the work. There is no "auto-approve" here (unlike the web app's default): every request is explicit.
//
// Pure TypeScript with no storage: pending requests live in memory (as in MetaMask, a host restart drops them and their callers see a rejection).

export type ApprovalKind = 'sign' | 'transaction' | 'connect';

export interface ApprovalRequestInfo {
  id: string;
  kind: ApprovalKind;
  /** Who is asking: a web page origin, or 'wallet' for the wallet's own UI. */
  origin: string;
  /** One line the UI shows to the user. */
  summary: string;
  /** Structured details for the UI (never includes a key). */
  details?: Record<string, unknown>;
  createdAt: number;
}

export class ApprovalRejectedError extends Error {
  constructor(reason?: string) {
    super(reason || 'The request was rejected.');
    this.name = 'ApprovalRejectedError';
  }
}

interface Pending<T> {
  info: ApprovalRequestInfo;
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

export class ApprovalController {
  private pending = new Map<string, Pending<unknown>>();
  private listeners = new Set<() => void>();
  private counter = 0;

  constructor(private readonly now: () => number = () => Date.now()) {}

  /**
   * Queue a request. The returned promise settles only after the user decides: approve runs `run` (the signing or sending) and resolves with its
   * result, or rejects with its error; reject rejects with ApprovalRejectedError. `run` is not called before approval.
   */
  request<T>(info: Omit<ApprovalRequestInfo, 'id' | 'createdAt'>, run: () => Promise<T>): Promise<T> {
    const id = `approval-${++this.counter}-${Math.random().toString(36).slice(2, 10)}`;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { info: { ...info, id, createdAt: this.now() }, run, resolve: resolve as (v: unknown) => void, reject });
      this.emit();
    });
  }

  list(): ApprovalRequestInfo[] {
    return Array.from(this.pending.values()).map((p) => p.info);
  }

  /** Approve: run the work. Returns once the work has finished (success or failure is also delivered to the original caller). */
  async approve(id: string): Promise<void> {
    const p = this.take(id);
    try {
      p.resolve(await p.run());
    } catch (error) {
      p.reject(error);
    }
  }

  reject(id: string, reason?: string): void {
    this.take(id).reject(new ApprovalRejectedError(reason));
  }

  /** Reject everything pending (the wallet locked, or the host is shutting down). */
  rejectAll(reason = 'The wallet was locked.'): void {
    for (const id of Array.from(this.pending.keys())) this.reject(id, reason);
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private take(id: string): Pending<unknown> {
    const p = this.pending.get(id);
    if (!p) throw new Error('No such pending request.');
    this.pending.delete(id);
    this.emit();
    return p;
  }

  private emit(): void {
    for (const l of Array.from(this.listeners)) l();
  }
}
