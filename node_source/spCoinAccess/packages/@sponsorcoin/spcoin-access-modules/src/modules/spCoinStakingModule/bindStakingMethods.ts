// @ts-nocheck
import * as stakingMethods from "./methods";
export function bindStakingMethods(context) {
    const boundMethods = context;
    const methodEntries = Object.entries(stakingMethods);
    for (const [name, method] of methodEntries) {
        boundMethods[name] = (...args) => method(context, ...args);
    }
}

