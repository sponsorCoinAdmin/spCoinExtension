/** Height of every row in the address / list column (list rows, preview row, address bar). */
export declare const ADDRESS_ROW_HEIGHT_PX: 26.5;
export interface HexAddressInputProps {
    inputValue: string;
    onChange: (val: string) => void;
    placeholder: string;
    statusEmoji?: string;
    fullWidth?: boolean;
    fitWidthCh?: number;
}
export default function HexAddressInput({ inputValue, onChange, placeholder, statusEmoji, fullWidth, fitWidthCh, }: HexAddressInputProps): import("react/jsx-runtime").JSX.Element;
