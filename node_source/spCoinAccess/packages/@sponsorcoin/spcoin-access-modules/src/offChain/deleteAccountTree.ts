// @ts-nocheck
/**
 * SponsorCoin Access Modules
 * File: src/offChain/deleteAccountTree.ts
 * Role: Off-chain helper that removes sponsor-recipient relationships from live on-chain state.
 */
export async function deleteAccountTree() {
    const read = this.onChain?.read;
    const deleteMethods = this.onChain?.delete;
    if (!read || !deleteMethods) {
        throw new Error("deleteAccountTree requires onChain read and delete access.");
    }
    if (typeof read.getRecipientKeys !== "function" && typeof read.getAccountRecipientList !== "function") {
        throw new Error("deleteAccountTree requires getRecipientKeys on the onChain read processor.");
    }
    if (typeof deleteMethods.deleteAccountRecord !== "function") {
        throw new Error("deleteAccountTree requires deleteAccountRecord on the onChain delete processor.");
    }
    const summary = {
        accountCount: 0,
        recipientCount: 0,
        deletedRecipientCount: 0,
        deletedAccountCount: 0,
    };
    const signerKey = String(
        (
            (this.onChain?.delete?.signer && (this.onChain?.delete?.signer.address || "")) ||
            ""
        ),
    ).trim();
    const countedAccountKeys = new Set();
    const processedAccountKeys = new Set();
    const activeAccountKeys = new Set();
    const sleep = async (ms) => await new Promise((resolve) => setTimeout(resolve, ms));
    const isRetryableTransportError = (error) => {
        const text = String(error?.message || error || "").toLowerCase();
        return (
            text.includes("failed to fetch") ||
            text.includes("fetchrequest.geturl") ||
            text.includes("network error") ||
            text.includes("timeout") ||
            text.includes("socket hang up") ||
            text.includes("missing response") ||
            text.includes("could not coalesce error")
        );
    };
    const callWithRetry = async (label, fn, attempts = 3, delayMs = 350) => {
        let lastError;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (!isRetryableTransportError(error) || attempt === attempts) {
                    throw error;
                }
                this.logger?.logDetail?.(
                    `JS => deleteAccountTree ${label} retry #${String(attempt)} after transport error: ${String(error?.message || error)}`,
                );
                await sleep(delayMs * attempt);
            }
        }
        throw lastError;
    };
    const isLiveAccount = async (accountKey) => {
        if (typeof read.isAccountInserted === "function") {
            // callWithRetry above already retries a transient transport error;
            // if it still throws here, that's not a confirmed "this account
            // isn't live" — it's "we couldn't determine that." Every caller
            // (getLiveRecipientList, deleteLiveSponsorTree, the top-level
            // signer check) previously treated a swallowed `false` here as
            // fact and silently skipped/short-circuited that subtree, which
            // could under-delete without any error ever surfacing. Letting it
            // propagate instead aborts the whole deleteAccountTree() call
            // with a clear error, so a failed liveness check is retried by
            // the caller rather than silently reported as "nothing to do."
            return Boolean(
                await callWithRetry(
                    `isAccountInserted(${accountKey})`,
                    () => read.isAccountInserted(accountKey),
                ),
            );
        }
        return true;
    };
    const getLiveRecipientList = async (sponsorKey) => {
        if (!(await isLiveAccount(sponsorKey))) return [];
        const result = await callWithRetry(
            `getRecipientKeys(${sponsorKey})`,
            () => (typeof read.getRecipientKeys === "function" ? read.getRecipientKeys(sponsorKey) : read.getAccountRecipientList(sponsorKey)),
        );
        return Array.isArray(result) ? result.map((value) => String(value)) : [];
    };
    const deleteLiveSponsorTree = async (sponsorKey, isRoot = false) => {
        if (processedAccountKeys.has(sponsorKey)) {
            return;
        }
        if (!(await isLiveAccount(sponsorKey))) {
            processedAccountKeys.add(sponsorKey);
            return;
        }
        if (!countedAccountKeys.has(sponsorKey)) {
            countedAccountKeys.add(sponsorKey);
            summary.accountCount += 1;
        }
        if (activeAccountKeys.has(sponsorKey)) {
            this.logger?.logDetail?.(`JS => deleteAccountTree skipping recursive cycle for ${sponsorKey}`);
            return;
        }
        activeAccountKeys.add(sponsorKey);
        try {
            let recipientList = await getLiveRecipientList(sponsorKey);
            while (recipientList.length > 0) {
                const recipientKey = String(recipientList[0]);
                summary.recipientCount += 1;
                if (await isLiveAccount(recipientKey)) {
                    await deleteLiveSponsorTree(recipientKey, false);
                }
                const refreshedRecipientList = await getLiveRecipientList(sponsorKey);
                const relationshipStillExists = refreshedRecipientList.some(
                    (value) => value.toLowerCase() === recipientKey.toLowerCase(),
                );
                if (relationshipStillExists) {
                    await callWithRetry(
                        `unSponsorRecipient(${sponsorKey},${recipientKey})`,
                        () => deleteMethods.unSponsorRecipient({ accountKey: sponsorKey }, recipientKey),
                    );
                    summary.deletedRecipientCount += 1;
                    await sleep(200);
                }
                recipientList = await getLiveRecipientList(sponsorKey);
            }
            if (isRoot && (await isLiveAccount(sponsorKey))) {
                await callWithRetry(
                    `deleteAccountRecord(${sponsorKey})`,
                    () => deleteMethods.deleteAccountRecord(sponsorKey),
                );
                summary.deletedAccountCount += 1;
                await sleep(200);
            }
            processedAccountKeys.add(sponsorKey);
        } finally {
            activeAccountKeys.delete(sponsorKey);
        }
    };
    if (!signerKey) {
        throw new Error("deleteAccountTree requires a connected signer.");
    }
    if (!(await isLiveAccount(signerKey))) {
        this.logger?.logDetail?.(`JS => deleteAccountTree signer tree not found for ${signerKey}; nothing to delete`);
        return summary;
    }
    await deleteLiveSponsorTree(signerKey, true);
    this.logger?.logDetail?.(`JS => deleteAccountTree summary = ${JSON.stringify(summary)}`);
    return summary;
}
