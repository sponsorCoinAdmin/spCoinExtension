// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/refresh/refreshTree.ts
//
// 2026-11-09 (owner design): the wallet's Refresh is one tree. Every panel, and every component inside a panel that shows loaded data (an image, a record, a table), is a NODE in the tree; a node says what to drop (invalidate) and how to
// load it again (reload). Refresh walks the whole tree, runs every node's invalidate first, then every node's reload. No central list of caches has to be kept in step with the screens: a screen that is on screen is in the tree, a screen that is
// not mounted is not (its entries are dropped when it opens again), so a refresh covers exactly what the person sees and nothing else.
//
// The two steps of a refresh (owner, 2026-11-09), run across the whole tree one after the other:
//   1. refreshPanelCache       refresh and restore the cache entries the node shows: drop them and read them through the cache again (an image, a record, a table's data);
//   2. updatePanelMethodCalls  run the node's live calls and calculations again (balanceOf, a staked amount, an estimate), which may need what step 1 restored.
// (Where this header says "invalidate" and "reload" above, step 1 is the invalidate and the reload of one cache entry, done together.)
//
// This file is plain TypeScript (no React, no DOM) so both hosts and the tests use it as is; refreshReact.tsx binds it to components.
//   - a node's parent is fixed when it is made, so a child can be made before its parent is attached (React runs a child's effect first);
//   - one node failing never stops the others: errors are collected in the report;
//   - ctx.once(key, fn) runs fn once per refresh for a cache key, however many nodes ask (two components showing the same image share one fetch);
//   - a refresh asked for while one is running joins it.
export function createRefreshNode(parent, id, spec = {}) {
    return { id, parent, children: new Set(), spec };
}
/** Put a node in the tree under its parent. Returns the function that takes it out again. */
export function attachRefreshNode(node) {
    node.parent?.children.add(node);
    return () => {
        node.parent?.children.delete(node);
    };
}
function walk(node, visit, prefix = '') {
    const path = prefix ? `${prefix}/${node.id}` : node.id;
    visit(node, path);
    for (const child of node.children)
        walk(child, visit, path);
}
export function createRefreshTree(rootId = 'MERIT_WALLET') {
    const root = createRefreshNode(undefined, rootId);
    let runCount = 0;
    let running;
    const execute = async () => {
        const run = ++runCount;
        const once = new Map();
        const ctx = {
            run,
            once: (key, fn) => {
                if (!once.has(key))
                    once.set(key, Promise.resolve().then(fn));
                return once.get(key);
            },
        };
        const nodes = [];
        walk(root, (n) => nodes.push(n));
        const errors = [];
        const phase = async (name) => {
            await Promise.all(nodes.map(async (node) => {
                const fn = node.spec[name];
                if (!fn)
                    return;
                try {
                    await fn(ctx);
                }
                catch (error) {
                    errors.push({ node: node.id, phase: name, error });
                }
            }));
        };
        await phase('refreshPanelCache');
        await phase('updatePanelMethodCalls');
        return { run, nodes: nodes.length, errors };
    };
    return {
        root,
        refresh: () => {
            if (!running)
                running = execute().finally(() => { running = undefined; });
            return running;
        },
        describe: () => {
            const paths = [];
            walk(root, (_n, path) => paths.push(path));
            return paths;
        },
    };
}
