export declare enum FEED_TYPE {
    REMOTE_AGENT_ACCOUNTS = 0,
    REMOTE_SPONSOR_ACCOUNTS = 1,
    REMOTE_RECIPIENT_ACCOUNTS = 2,
    REMOTE_TOKEN_LIST = 3,
    REMOTE_ACCOUNT_SEND_LIST = 4,
    MANAGE_AGENTS = 5,
    MANAGE_RECIPIENTS = 6,
    WALLET_ACCOUNTS = 7
}
export declare enum STATUS {
    CONNECTED = 0,
    DISCONNECTED = 1,
    CONNECTING = 2,
    RECONNECTING = 3,
    ERROR_API_PRICE = 4,
    FAILED = 5,
    MESSAGE_ERROR = 6,
    SUCCESS = 7,
    WARNING_HARDHAT = 8,
    INFO = 9,
    MISSING = 10,
    /** Generic non-critical warning, distinct from WARNING_HARDHAT (specifically "wrong network"). */
    WARNING = 11,
    /** Developer diagnostics — not user-facing, must not interrupt the current screen. */
    TRACE_DEBUGGING = 12
}
export declare enum TRADE_DIRECTION {
    SELL_EXACT_OUT = 0,
    BUY_EXACT_IN = 1
}
export declare enum BUTTON_TYPE {
    API_TRANSACTION_ERROR = 0,
    BUY_ERROR_REQUIRED = 1,
    BUY_TOKEN_REQUIRED = 2,
    CONNECT = 3,
    INSUFFICIENT_BALANCE = 4,
    IS_LOADING_PRICE = 5,
    NO_HARDHAT_API = 6,
    SELL_ERROR_REQUIRED = 7,
    SELL_TOKEN_REQUIRED = 8,
    SWAP = 9,
    TOKENS_REQUIRED = 10,
    UNDEFINED = 11,
    ZERO_AMOUNT = 12
}
