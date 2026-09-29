// File: src/hooks/trade/sponsorRateConfigStore.ts
//
// 2026-09-27, moved from the parent app's lib/store/sponsorRateConfigStore.ts
// (on request, "migrate ConfigSponsorshipPanel"). Same pattern as
// sponsorModeStore — a plain module-level pub-sub singleton, zero web-app/
// Next.js-specific dependency. No localStorage persistence (in-memory only,
// same as sponsorModeStore) — the web app can re-add its own persistence
// layer if needed via a separate effect, but the core rate-config state +
// deriveSponsorRatePercentages derivation must be shared so the package's
// ConfigSponsorshipPanel shell and the web app's trade-button execution
// (which reads the same store at click-time) can never drift apart.

export interface SponsorRateConfig {
  sponsorStep: number;
  agentStep: number;
}

const DEFAULT_STATE: SponsorRateConfig = {
  sponsorStep: 50,
  agentStep: 50,
};

let state: SponsorRateConfig = { ...DEFAULT_STATE };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const sponsorRateConfigStore = {
  get(): SponsorRateConfig {
    return state;
  },
  setSponsorStep(value: number) {
    if (state.sponsorStep === value) return;
    state = { ...state, sponsorStep: value };
    emit();
  },
  setAgentStep(value: number) {
    if (state.agentStep === value) return;
    state = { ...state, agentStep: value };
    emit();
  },
  reset() {
    state = { ...DEFAULT_STATE };
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): SponsorRateConfig {
    return state;
  },
  getServerSnapshot(): SponsorRateConfig {
    return { ...DEFAULT_STATE };
  },
};

export function deriveSponsorRatePercentages(
  raw: SponsorRateConfig,
  recipientRateRange: [number, number] = [0, 100],
  agentRateRange: [number, number] = [0, 100],
): { sponsorPct: number; recipientPct: number; agentPct: number } {
  const [minRecipientStep, maxRecipientStep] = recipientRateRange;
  const [minAgentStep, maxAgentStep] = agentRateRange;

  const clampedSponsorStep = Math.min(Math.max(raw.sponsorStep, minRecipientStep), maxRecipientStep);
  const clampedAgentStep = Math.min(Math.max(raw.agentStep, minAgentStep), maxAgentStep);

  const sponsorPct = 100 - clampedSponsorStep;
  const remainingBal = clampedSponsorStep;
  const sliderRatioRange = clampedAgentStep / 1000;

  const agentPct = Number((remainingBal * sliderRatioRange).toFixed(2));
  const recipientPct = Number((remainingBal - agentPct).toFixed(2));

  return { sponsorPct, recipientPct, agentPct };
}
