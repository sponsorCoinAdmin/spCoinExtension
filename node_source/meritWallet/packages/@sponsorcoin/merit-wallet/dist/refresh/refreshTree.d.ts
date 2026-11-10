export type RefreshPhase = 'refreshPanelCache' | 'updatePanelMethodCalls';
/** What a node's callbacks are given. */
export interface RefreshRun {
    /** 1 for the first refresh of this tree, 2 for the next, ...: a value that changes with every refresh (an image URL's version). */
    run: number;
    /** Run fn once in this refresh for this cache key; later callers get the same promise. */
    once<T>(key: string, fn: () => Promise<T> | T): Promise<T>;
}
export interface RefreshNodeSpec {
    /** Step 1: refresh and restore this node's cache entries (runs for every node before any node's step 2). */
    refreshPanelCache?: (run: RefreshRun) => void | Promise<void>;
    /** Step 2: run this node's live calls and calculations again (runs after every node's step 1). */
    updatePanelMethodCalls?: (run: RefreshRun) => void | Promise<void>;
}
export interface RefreshNode {
    readonly id: string;
    readonly parent: RefreshNode | undefined;
    readonly children: Set<RefreshNode>;
    /** Replaced freely (a component keeps the latest callbacks here); read when a refresh runs. */
    spec: RefreshNodeSpec;
}
export interface RefreshError {
    node: string;
    phase: RefreshPhase;
    error: unknown;
}
export interface RefreshReport {
    run: number;
    nodes: number;
    errors: RefreshError[];
}
export declare function createRefreshNode(parent: RefreshNode | undefined, id: string, spec?: RefreshNodeSpec): RefreshNode;
/** Put a node in the tree under its parent. Returns the function that takes it out again. */
export declare function attachRefreshNode(node: RefreshNode): () => void;
export interface RefreshTree {
    readonly root: RefreshNode;
    /** Invalidate every node, then reload every node. */
    refresh(): Promise<RefreshReport>;
    /** The tree as "PANEL/CHILD/GRANDCHILD" paths, one per node (for the trace and the tests). */
    describe(): string[];
}
export declare function createRefreshTree(rootId?: string): RefreshTree;
