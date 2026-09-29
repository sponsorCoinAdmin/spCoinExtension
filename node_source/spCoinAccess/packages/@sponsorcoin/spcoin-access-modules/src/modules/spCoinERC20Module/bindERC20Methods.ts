// @ts-nocheck
import * as erc20Methods from "./methods";
export function bindERC20Methods(context) {
    const boundMethods = context;
    const methodEntries = Object.entries(erc20Methods);
    for (const [name, method] of methodEntries) {
        boundMethods[name] = (...args) => method(context, ...args);
    }
}

