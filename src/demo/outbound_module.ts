import * as zmq from "zeromq"

export async function run(name: string) {
    const sock = new zmq.Subscriber;
    sock.connect("tcp://127.0.0.1:6667");
    sock.subscribe();
    console.log("Subscriber connected to backbone.");

    let id = 0;
    for await (const [topic, msg] of sock) {
        console.log(`Module ${name} | received a message id: ${++id} related to: ${topic.toString()} containing message: ${msg.toString()}`);
    }
}