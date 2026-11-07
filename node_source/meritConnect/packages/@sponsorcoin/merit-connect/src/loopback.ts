// File: src/loopback.ts
//
// 2026-11-06 (docs/design/meritConnectDesign.txt, section 9): the in-memory transport. It wires a relay to a responder with no browser, and has switches to DROP, DUPLICATE and DELAY messages and to change who the
// transport says the sender is, so the cases that were hard to see in the real apps (a dropped request, a mismatched sender, a replayed id) are plain tests. Other apps use it for their own tests too.
import type { Relay, Sender } from './relay.js';
import type { Responder } from './responder.js';
import type { Reply, Request, SelectionPush } from './protocol.js';

export interface LoopbackOptions {
  /** The identity the transport reports for the responder's messages (what the browser would say). */
  sender?: Sender;
}

export type Direction = 'request' | 'reply' | 'push';

export function createLoopback(options: LoopbackOptions = {}) {
  let relay: Relay | undefined;
  let responder: Responder | undefined;
  let sender: Sender = options.sender ?? { id: 1, origin: 'https://wallet.example' };
  const dropped = new Set<Direction>();
  const duplicated = new Set<Direction>();
  const held: Array<() => void> = [];
  let delaying = false;

  const deliver = (direction: Direction, fn: () => void) => {
    if (dropped.has(direction)) return;
    const run = () => {
      fn();
      if (duplicated.has(direction)) fn();
    };
    if (delaying) held.push(run);
    else run();
  };

  return {
    /** Connect the two halves once both exist. */
    attach(parts: { relay: Relay; responder: Responder }) {
      relay = parts.relay;
      responder = parts.responder;
    },
    /** For RelayDeps.send: the request travels to the responder. */
    sendRequest(_targetId: number | string, message: Request) {
      deliver('request', () => void responder?.handle(message));
    },
    /** For ResponderDeps.reply: the reply travels back, with the sender identity the transport reports. */
    sendReply(reply: Reply) {
      deliver('reply', () => void relay?.accept(sender, reply));
    },
    /** For ResponderDeps.push. */
    sendPush(push: SelectionPush) {
      deliver('push', () => void relay?.acceptPush(sender, push));
    },
    /** Change who the transport says is sending (a mismatched tab or origin). */
    setSender(next: Sender) {
      sender = next;
    },
    drop(direction: Direction, on = true) {
      if (on) dropped.add(direction);
      else dropped.delete(direction);
    },
    duplicate(direction: Direction, on = true) {
      if (on) duplicated.add(direction);
      else duplicated.delete(direction);
    },
    /** Hold every message until release() (a slow link). */
    delay(on = true) {
      delaying = on;
    },
    release() {
      delaying = false;
      while (held.length) held.shift()?.();
    },
    heldCount: () => held.length,
  };
}

export type Loopback = ReturnType<typeof createLoopback>;
