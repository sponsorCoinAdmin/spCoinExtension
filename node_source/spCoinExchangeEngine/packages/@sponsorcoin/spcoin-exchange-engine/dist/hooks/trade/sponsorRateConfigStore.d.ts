export interface SponsorRateConfig {
    sponsorStep: number;
    agentStep: number;
}
export declare const sponsorRateConfigStore: {
    get(): SponsorRateConfig;
    setSponsorStep(value: number): void;
    setAgentStep(value: number): void;
    reset(): void;
    subscribe(listener: () => void): () => boolean;
    getSnapshot(): SponsorRateConfig;
    getServerSnapshot(): SponsorRateConfig;
};
export declare function deriveSponsorRatePercentages(raw: SponsorRateConfig, recipientRateRange?: [number, number], agentRateRange?: [number, number]): {
    sponsorPct: number;
    recipientPct: number;
    agentPct: number;
};
