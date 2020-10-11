import { Channel } from "twitch/lib";
import * as zmq from "zeromq"
import { MessageTypes, InboundMessage, OutboundMessage } from "../lib/types"

let seenUsers = new Set();

export async function run(name: string, hostport: string) {
    const pub = new zmq.Publisher;
    await pub.bind(hostport);

    const sock = new zmq.Request;
    sock.connect("tcp://127.0.0.1:6666");
    await sock.send(hostport);
    const [msg] = await sock.receive();
    if (msg.toString() !== "ACK") {
        console.error(`Module ${name} | Something weird happened.`);
    } else {
        console.log(`Module ${name} | Recevied confirmation from backbone.`);
    }

    const sub = new zmq.Subscriber;
    sub.connect("tcp://127.0.0.1:6667");
    sub.subscribe(MessageTypes[MessageTypes.InboundChat]);

    for await (const [topic, msg] of sub) {
        let m = JSON.parse(msg.toString()) as InboundMessage;
        if (!seenUsers.has(m.user)) {
            let message = JSON.stringify(new OutboundMessage(m.platform, `Hello, I'm the greeter bot, I greet people. This was your first message I have seen, so I greet you in the channel ${m.user}`));
            await pub.send([MessageTypes[MessageTypes.OutboundChat], message]);
            seenUsers.add(m.user);
        }
    }
}