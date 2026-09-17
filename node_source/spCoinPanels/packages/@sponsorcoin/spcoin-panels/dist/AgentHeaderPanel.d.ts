import { type AgentSelectDropDownProps } from './AgentSelectDropDown';
export interface AgentHeaderPanelProps extends AgentSelectDropDownProps {
    /** The selected agent's display name — shown as the title. Omit (or
     *  blank/whitespace-only) for titlePlaceholder, matching the real app's
     *  `agentAccount?.name?.trim() || AGENT_TITLE_PLACEHOLDER`. */
    agentName?: string;
    /** Shown as the title when agentName is absent. */
    titlePlaceholder?: string;
    /** Subtitle under the title. Matches the real app's own default
     *  (NEXT_PUBLIC_AGENT_SUB_TITLE's fallback). */
    subtitle?: string;
}
export default function AgentHeaderPanel({ agentName, titlePlaceholder, subtitle, icon, address, symbol, placeholderLabel, onSelectClick, }: AgentHeaderPanelProps): import("react/jsx-runtime").JSX.Element;
