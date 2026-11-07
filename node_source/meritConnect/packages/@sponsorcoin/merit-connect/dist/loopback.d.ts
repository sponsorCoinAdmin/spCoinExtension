import type { Relay, Sender } from './relay.js';
import type { Responder } from './responder.js';
import type { Reply, Request, SelectionPush } from './protocol.js';
export interface LoopbackOptions {
    /** The identity the transport reports for the responder's messages (what the browser would say). */
    sender?: Sender;
}
export type Direction = 'request' | 'reply' | 'push';
export declare function createLoopback(options?: LoopbackOptions): {
    /** Connect the two halves once both exist. */
    attach(parts: {
        relay: Relay;
        responder: Responder;
    }): void;
    /** For RelayDeps.send: the request travels to the responder. */
    sendRequest(_targetId: number | string, message: Request): void;
    /** For ResponderDeps.reply: the reply travels back, with the sender identity the transport reports. */
    sendReply(reply: Reply): void;
    /** For ResponderDeps.push. */
    sendPush(push: SelectionPush): void;
    /** Change who the transport says is sending (a mismatched tab or origin). */
    setSender(next: Sender): void;
    drop(direction: Direction, on?: boolean): void;
    duplicate(direction: Direction, on?: boolean): void;
    /** Hold every message until release() (a slow link). */
    delay(on?: boolean): void;
    release(): void;
    heldCount: () => number;
};
export type Loopback = ReturnType<typeof createLoopback>;
