// @ts-nocheck
import { addBackDatedRecipientTransaction } from "./addBackDatedRecipientTransaction";

export const addBackDatedSponsorship = async (context, _adminSigner, _recipientKey, _recipientRateKey, _transactionQty, _transactionBackDate) => {
    return addBackDatedRecipientTransaction(
        context,
        _adminSigner,
        _recipientKey,
        _recipientRateKey,
        _transactionQty,
        _transactionBackDate
    );
};

