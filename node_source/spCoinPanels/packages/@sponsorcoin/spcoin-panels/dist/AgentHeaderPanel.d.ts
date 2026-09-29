import React from 'react';
export interface AgentHeaderPanelProps {
    /** The selected agent's display name — shown as the title. Omit (or
     *  blank/whitespace-only) for titlePlaceholder, matching the real app's
     *  `agentAccount?.name?.trim() || AGENT_TITLE_PLACEHOLDER`. */
    agentName?: string;
    /** Shown as the title when agentName is absent. */
    titlePlaceholder?: string;
    /** Subtitle under the title. Matches the real app's own default
     *  (NEXT_PUBLIC_AGENT_SUB_TITLE's fallback). */
    subtitle?: string;
    /** The agent picker dropdown (and any wrapper around it). Rendered in
     *  the AGENT_SELECT_DROP_DOWN row below the title/subtitle. The web app
     *  passes its own hook-wiring AgentSelectDropDown wrapper here. */
    children?: React.ReactNode;
    /** Address to seed as the default agent on first load when none is
     *  selected yet — the web app's NEXT_PUBLIC_DEFAULT_AGENT_ADDRESS env var.
     *  Omit (or pass a non-address) to skip seeding. */
    defaultAgentAddress?: string;
    /** Resolve an agent account from a raw address — the web app's own
     *  hydrateAccountFromAddress, wrapped to return the subset this component
     *  cares about. Called once, only, on first load if agentName is absent
     *  and defaultAgentAddress is a valid address. */
    onHydrateAgent?: (address: string) => Promise<HydratedAgent | undefined>;
    /** Commit the hydrated default agent back into the app's account state. */
    onSetAgentAccount?: (account: HydratedAgent) => void;
    /** Optional debug trace sink — the web app passes its own
     *  appendDebugTrace so the package stays free of @/-aliased imports. */
    debugTrace?: (label: string, data?: Record<string, unknown>) => void;
}
/** Minimal subset of spCoinAccount this component reads after hydration. */
export interface HydratedAgent {
    address: string;
    name?: string;
    symbol?: string;
    logoURL?: string;
}
export default function AgentHeaderPanel({ agentName, titlePlaceholder, subtitle, children, defaultAgentAddress, onHydrateAgent, onSetAgentAccount, debugTrace, }: AgentHeaderPanelProps): React.JSX.Element;
