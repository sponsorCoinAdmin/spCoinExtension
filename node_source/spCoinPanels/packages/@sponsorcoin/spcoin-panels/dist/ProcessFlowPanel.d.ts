export interface ProcessFlowPanelProps {
    /** e.g. "Signing Swapping via Uniswap V3…" — matches the real app's own
     *  title-bar convention during a pending write. */
    statusText?: string;
}
export default function ProcessFlowPanel({ statusText }: ProcessFlowPanelProps): import("react/jsx-runtime").JSX.Element;
