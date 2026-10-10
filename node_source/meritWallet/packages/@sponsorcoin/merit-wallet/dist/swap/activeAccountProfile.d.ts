export interface ActiveAccountProfile {
    address?: string;
    name?: string;
    symbol?: string;
    /** The avatar image URL (the same one the header shows). */
    logoURL?: string;
}
export declare const ActiveAccountProfileContext: import("react").Context<ActiveAccountProfile | undefined>;
export declare function useActiveAccountProfile(): ActiveAccountProfile | undefined;
