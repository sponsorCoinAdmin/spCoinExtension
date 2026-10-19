import React from 'react';
export interface ApprovalHost {
    /** Check the wallet password and unlock the wallet; true when it unlocked. Omitted: a request that needs a password is refused. */
    unlock?(password: string): Promise<boolean>;
    /** A debug gate: a request that asked to advance by hand waits for this before it resolves. Omitted: it resolves at once. */
    waitForManualAdvance?(): Promise<void>;
}
export default function ApprovalResponder({ host }: {
    host?: ApprovalHost;
}): React.JSX.Element | null;
