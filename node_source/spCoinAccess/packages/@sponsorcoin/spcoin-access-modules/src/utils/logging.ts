// @ts-nocheck
// File: /@sponsorcoin/spcoin-access-modules/utils/logging.ts
// ************************* LOG SECTION ******************************/
import { stringifyBigInt } from "@sponsorcoin/spcoin-lib/utils";
export let LOG = true;
export let LOG_DETAIL = false;
export let LOG_TEST_HEADER = false;
export let LOG_FUNCTION_HEADER = false;
export let LOG_SETUP = false;
export let LOG_TREE = false;
export let prefix = "";
export const indent = "  ";
export const LOG_MODE = {
    LOG: "LOG",
    LOG_DETAIL: "LOG_DETAIL",
    LOG_TEST_HEADER: "LOG_TEST_HEADER",
    LOG_FUNCTION_HEADER: "LOG_FUNCTION_HEADER",
    LOG_SETUP: "LOG_SETUP",
    LOG_TREE: "LOG_TREE",
};
export const setLogDefaults = (_log_mode, _state) => {
    LOG = true;
    LOG_DETAIL = false;
    LOG_TEST_HEADER = false;
    LOG_FUNCTION_HEADER = false;
    LOG_SETUP = false;
    LOG_TREE = false;
};
export class SpCoinLogger {
    constructor(_spCoinContractDeployed) {
        this.setLogMode = (_log_mode, _state) => {
            console.log("EXECUTING setLogMode = (" + _log_mode + ", " + _state + ")");
            switch (_log_mode) {
                case LOG_MODE.LOG:
                    console.log("Setting _log_mode LOG: " + _state);
                    LOG = _state;
                    break;
                case LOG_MODE.LOG_DETAIL:
                    console.log("Setting _log_mode LOG_DETAIL: " + _state);
                    LOG_DETAIL = _state;
                    break;
                case LOG_MODE.LOG_TEST_HEADER:
                    console.log("Setting _log_mode LOG_TEST_HEADER: " + _state);
                    LOG_TEST_HEADER = _state;
                    break;
                case LOG_MODE.LOG_FUNCTION_HEADER:
                    console.log("Setting _log_mode LOG_FUNCTION_HEADER: " + _state);
                    LOG_FUNCTION_HEADER = _state;
                    break;
                case LOG_MODE.LOG_SETUP:
                    console.log("Setting _log_mode LOG_SETUP: " + _state);
                    LOG_SETUP = _state;
                    break;
                case LOG_MODE.LOG_TREE:
                    console.log("Setting _log_mode LOG_SETUP: " + _state);
                    LOG_TREE = _state;
                    break;
                default:
                    console.log("Unknown _log_mode " + _log_mode);
            }
        };
        this.logSetup = (_text) => {
            if (LOG_SETUP) {
                this.log(_text);
            }
        };
        this.logTestHeader = (_testHeader) => {
            if (LOG_TEST_HEADER) {
                this.log(prefix + _testHeader);
            }
        };
        this.logFunctionHeader = (_functionHeader) => {
            if (LOG_FUNCTION_HEADER) {
                this.log(prefix + _functionHeader);
            }
            prefix += indent;
        };
        this.logExitFunction = () => {
            if (LOG_FUNCTION_HEADER) {
                prefix = prefix.slice(0, -indent.length);
                console.log("EXITING");
            }
        };
        this.logDetail = (_details) => {
            if (LOG_DETAIL) {
                this.log(_details);
            }
        };
        this.log = (_text) => {
            if (LOG) {
                console.log(_text);
            }
        };
        this.logPrefix = (_prefix, _text) => {
            this.log(_prefix + _text);
        };
        this.setIndentPrefixLevel = (_indentPrefix, _level) => {
            let localIndent = "";
            for (let i = 0; i < _level; i++) {
                localIndent += _indentPrefix;
            }
            return localIndent;
        };
        this.logJSONAccount = async (accountKey, headerStr, trailerStr) => {
            console.log("ACCOUNT RECORD DUMP");
            const accountRec = await this.spCoinContractDeployed.getAccountRecord(accountKey);
            this.logJSON(accountRec, headerStr, trailerStr);
            return accountRec;
        };
        this.logJSONTree = async (_obj, headerStr, trailerStr) => {
            console.log("START LOG JSON TREE");
            this.logJSON(_obj, headerStr, trailerStr);
            console.log("FINISH LOG JSON TREE");
        };
        this.logJSONStr = (str, _obj, headerStr, trailerStr) => {
            console.log(str, this.getJSON(_obj, headerStr, trailerStr));
        };
        this.logJSON = (_obj, headerStr, trailerStr) => {
            if (headerStr) {
                console.log("\nheaderStr");
            }
            console.log(stringifyBigInt(_obj, headerStr, trailerStr));
            if (trailerStr) {
                console.log("\trailerStr");
            }
        };
        this.getJSON = (_obj) => {
            return stringifyBigInt(_obj);
        };
        this.spCoinContractDeployed = _spCoinContractDeployed;
    }
}
