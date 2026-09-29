/**
 * SponsorCoin Access Modules
 * File: src/offChain/deleteAccountTree.ts
 * Role: Off-chain helper that removes sponsor-recipient relationships from live on-chain state.
 */
export declare function deleteAccountTree(): Promise<{
    accountCount: number;
    recipientCount: number;
    deletedRecipientCount: number;
    deletedAccountCount: number;
}>;
