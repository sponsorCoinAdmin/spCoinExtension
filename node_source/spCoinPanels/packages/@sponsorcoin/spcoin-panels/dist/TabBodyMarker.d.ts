import React from 'react';
export interface TabBodyMarkerProps {
    /** File path relative to this package's own src/, e.g. "TradingStationPanel.tsx". */
    path: string;
    build: number;
}
export default function TabBodyMarker({ path, build }: TabBodyMarkerProps): React.JSX.Element | null;
