export function createApprovalWaitingStore(now = Date.now) {
    let state = [];
    let nextId = 1;
    const listeners = new Set();
    const set = (next) => {
        state = next;
        listeners.forEach((l) => l());
    };
    return {
        getState: () => state,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        begin(entry) {
            const id = nextId++;
            set([...state, { ...entry, id, startedAt: now() }]);
            let ended = false;
            return () => {
                if (ended)
                    return;
                ended = true;
                set(state.filter((e) => e.id !== id));
            };
        },
    };
}
/** The one default store: the notice component reads it, the hosts wrap their remote authenticators with it. */
export const approvalWaiting = createApprovalWaitingStore();
const VERB = {
    connect: 'approve connecting this site',
    'sign a message': 'approve signing a message',
    'sign typed data': 'approve signing this data',
    'send a transaction': 'approve this transaction',
};
/** The one sentence a person reads while a request is open. */
export function approvalWaitingText(pending) {
    if (pending.length === 0)
        return '';
    const first = pending[0];
    const more = pending.length > 1 ? ` (${pending.length} requests are open)` : '';
    return `Waiting for ${first.label} to ${VERB[first.action]}. Look for its window or its icon in your browser.${more}`;
}
/** The same authenticator, with each request that needs the person's decision registered in the store while it is open. Everything else (id, label, capabilities, status, accounts, events) is the authenticator's own. */
export function withApprovalNotice(authenticator, store = approvalWaiting) {
    const track = async (action, run) => {
        const end = store.begin({ authenticatorId: authenticator.id, label: authenticator.label, action });
        try {
            return await run();
        }
        finally {
            end();
        }
    };
    const wrapped = Object.create(authenticator);
    Object.defineProperty(wrapped, 'signMessage', { value: (address, message) => track('sign a message', () => authenticator.signMessage(address, message)) });
    Object.defineProperty(wrapped, 'sendTransaction', { value: (tx) => track('send a transaction', () => authenticator.sendTransaction(tx)) });
    if (authenticator.signTypedData) {
        Object.defineProperty(wrapped, 'signTypedData', { value: (address, typedData) => track('sign typed data', () => authenticator.signTypedData(address, typedData)) });
    }
    if (authenticator.connect) {
        Object.defineProperty(wrapped, 'connect', { value: () => track('connect', () => authenticator.connect()) });
    }
    return wrapped;
}
