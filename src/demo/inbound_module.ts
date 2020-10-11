import * as zmq from "zeromq"

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

    while (true) {
        console.log(`Module ${name} | sending a message to the backbone`)
        await pub.send([`${name}`, "meow!"])
        await new Promise(resolve => setTimeout(resolve, 500))
    }
}