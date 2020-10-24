/* 
    This module provides text to speech logic.
    Deciding whether a particular chat message should be read
    based on the current settings and the status of 
    the sender / prefix - command in the chat message.
*/

import * as zmq from "zeromq"
import { MessageTypes, InboundMessage, TextToSpeechMessage, VoiceMapping } from "../lib/types"

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
        if (topic.toString() !== MessageTypes[MessageTypes.InboundChat])
            continue;
        let m = JSON.parse(msg.toString()) as InboundMessage;
        let out = new TextToSpeechMessage(m.msg, VoiceMapping.hazel);
        if (m.user.toLowerCase() === "happycerberus") {
            console.log(`Emitting a new text to speech message ${m.msg}`)
            await pub.send([MessageTypes[MessageTypes.TextToSpeech], JSON.stringify(out)]);
        }
    }
}