export interface NetworkDetailPanelProps {
    id: string;
    logoSrc?: string;
    name?: string;
    symbol?: string;
    isTestnet?: boolean;
}
export default function NetworkDetailPanel({ id, logoSrc, name, symbol, isTestnet }: NetworkDetailPanelProps): import("react/jsx-runtime").JSX.Element;
