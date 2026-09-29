export declare function resolveContract(value: any): any;
export declare class SpCoinOffChainProcessor {
    constructor(onChainOrContract: any);
    deleteAccountTree(): Promise<any>;
    setLowerRecipientRate(newLowerRecipientRate: any): Promise<any>;
    setUpperRecipientRate(newUpperRecipientRate: any): Promise<any>;
    setLowerAgentRate(newLowerAgentRate: any): Promise<any>;
    setUpperAgentRate(newUpperAgentRate: any): Promise<any>;
    setDefaultRecipientRate(newDefaultRecipientRate: any): Promise<any>;
    setDefaultAgentRate(newDefaultAgentRate: any): Promise<any>;
    methods(): {
        contract: any;
        onChain: any;
        deleteAccountTree: any;
        setLowerRecipientRate: any;
        setUpperRecipientRate: any;
        setLowerAgentRate: any;
        setUpperAgentRate: any;
        setDefaultRecipientRate: any;
        setDefaultAgentRate: any;
        logger: any;
        serialize: any;
        dateTime: any;
        dataTypes: any;
        printTreeStructures: any;
    };
}
