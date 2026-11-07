export function createLoopback(options = {}) {
    let relay;
    let responder;
    let sender = options.sender ?? { id: 1, origin: 'https://wallet.example' };
    const dropped = new Set();
    const duplicated = new Set();
    const held = [];
    let delaying = false;
    const deliver = (direction, fn) => {
        if (dropped.has(direction))
            return;
        const run = () => {
            fn();
            if (duplicated.has(direction))
                fn();
        };
        if (delaying)
            held.push(run);
        else
            run();
    };
    return {
        /** Connect the two halves once both exist. */
        attach(parts) {
            relay = parts.relay;
            responder = parts.responder;
        },
        /** For RelayDeps.send: the request travels to the responder. */
        sendRequest(_targetId, message) {
            deliver('request', () => void responder?.handle(message));
        },
        /** For ResponderDeps.reply: the reply travels back, with the sender identity the transport reports. */
        sendReply(reply) {
            deliver('reply', () => void relay?.accept(sender, reply));
        },
        /** For ResponderDeps.push. */
        sendPush(push) {
            deliver('push', () => void relay?.acceptPush(sender, push));
        },
        /** Change who the transport says is sending (a mismatched tab or origin). */
        setSender(next) {
            sender = next;
        },
        drop(direction, on = true) {
            if (on)
                dropped.add(direction);
            else
                dropped.delete(direction);
        },
        duplicate(direction, on = true) {
            if (on)
                duplicated.add(direction);
            else
                duplicated.delete(direction);
        },
        /** Hold every message until release() (a slow link). */
        delay(on = true) {
            delaying = on;
        },
        release() {
            delaying = false;
            while (held.length)
                held.shift()?.();
        },
        heldCount: () => held.length,
    };
}
