// @ts-nocheck
import * as deleteMethods from "./methods";
export function bindDeleteMethods(context) {
    const boundMethods = context;
    const methodEntries = Object.entries(deleteMethods);
    for (const [name, method] of methodEntries) {
        boundMethods[name] = (...args) => method(context, ...args);
    }
}

