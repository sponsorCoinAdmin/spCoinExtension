import { type ExchangeTradingPairProps } from './ExchangeTradingPair';
export interface TradingStationPanelProps extends ExchangeTradingPairProps {
    onSubmit?: () => void;
    submitLabel?: string;
}
export default function TradingStationPanel({ onSubmit, submitLabel, ...exchangeTradingPairProps }: TradingStationPanelProps): import("react/jsx-runtime").JSX.Element;
