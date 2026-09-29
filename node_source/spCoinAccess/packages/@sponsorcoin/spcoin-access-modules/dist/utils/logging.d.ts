export declare let LOG: boolean;
export declare let LOG_DETAIL: boolean;
export declare let LOG_TEST_HEADER: boolean;
export declare let LOG_FUNCTION_HEADER: boolean;
export declare let LOG_SETUP: boolean;
export declare let LOG_TREE: boolean;
export declare let prefix: string;
export declare const indent = "  ";
export declare const LOG_MODE: {
    LOG: string;
    LOG_DETAIL: string;
    LOG_TEST_HEADER: string;
    LOG_FUNCTION_HEADER: string;
    LOG_SETUP: string;
    LOG_TREE: string;
};
export declare const setLogDefaults: (_log_mode: any, _state: any) => void;
export declare class SpCoinLogger {
    constructor(_spCoinContractDeployed: any);
}
