export declare class SpCoinAdminModule {
    constructor(_spCoinContractDeployed: any);
    setLowerRecipientRate(newLowerRecipientRate: any): Promise<any>;
    setUpperRecipientRate(newUpperRecipientRate: any): Promise<any>;
    setLowerAgentRate(newLowerAgentRate: any): Promise<any>;
    setUpperAgentRate(newUpperAgentRate: any): Promise<any>;
    addBackDatedSponsorship(...args: any[]): Promise<any>;
    addBackDatedAgentSponsorship(...args: any[]): Promise<any>;
    addBackDatedRecipientSponsorship(...args: any[]): Promise<any>;
    addBackDatedRecipientTransaction(...args: any[]): Promise<any>;
    addBackDatedAgentTransaction(...args: any[]): Promise<any>;
    backDateRecipientTransaction(...args: any[]): Promise<any>;
    backDateRecipientTransactionDate(...args: any[]): Promise<any>;
    backDateAgentTransaction(...args: any[]): Promise<any>;
    backDateAgentTransactionDate(...args: any[]): Promise<any>;
}
