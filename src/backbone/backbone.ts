import * as zmq from "zeromq"
import { MessageTypes } from "../lib/types"
import { PublisherQueue } from "../lib/publisher_queue"

async function listen(name: string, sub: zmq.Subscriber, pub: PublisherQueue) {
    let id = 0;
    for await (const [topic, msg] of sub) {
        console.log(`BACKBONE | ${name} | received a message id: ${++id} related to: ${topic} containing message: ${msg.toString()}`);
        pub.send(topic, msg);
    }
}

export async function producer_connect(hostport: string): Promise<zmq.Publisher> {
    return new Promise((resolve, reject) => {
        const pub = new zmq.Publisher;
        pub.bind(hostport).then(() => {
            const sock = new zmq.Request;
            sock.connect("tcp://127.0.0.1:6666");
            sock.send(hostport).then(() => {
                sock.receive().then(([msg]) => {
                    if (msg.toString() !== "ACK") {
                        throw new Error(`Unexpected response from backend for inbound module at ${hostport}.`);
                    } else {
                        console.log(`Module at ${hostport} connected successfully.`);
                        resolve(pub);
                    }
                });
            });
        });
    });
}

export async function run() {
    const sock = new zmq.Reply;
    const pub = new zmq.Publisher
    await sock.bind("tcp://127.0.0.1:6666");
    await pub.bind("tcp://127.0.0.1:6667");

    let retransmitter = new PublisherQueue(pub);
    retransmitter.run();

    for await (const [msg] of sock) {
        const sub = new zmq.Subscriber;
        try {
            sub.connect(msg.toString());
            sub.subscribe();
        } catch (err) {
            console.error(`BACKBONE | Backbone received a malformed message : ${err}`);
        }
        listen(msg.toString(), sub, retransmitter);
        await sock.send("ACK").catch(err => {
            console.error(`BACKBONE | Failed to confirm connection of module ${err}`);
        });
    }
}