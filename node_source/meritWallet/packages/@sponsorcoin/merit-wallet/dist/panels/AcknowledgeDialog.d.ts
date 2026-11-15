import type { MessagePanelAcknowledgement } from './MessagePanelReal';
export default function AcknowledgeDialog({ ack, onAccept, onClose }: {
    ack: MessagePanelAcknowledgement;
    onAccept: () => void;
    onClose: () => void;
}): import("react/jsx-runtime").JSX.Element;
