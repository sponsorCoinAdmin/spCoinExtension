import * as addMethods from "./methods";
export function bindAddMethods(context) {
    const methodEntries = Object.entries(addMethods);
    for (const [name, method] of methodEntries) {
        context[name] = ((...args) => method(context, ...args));
    }
}
