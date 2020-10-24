// This file contains the inbound module for twitch chat.

import * as twitch_auth from "./auth"
import * as twitch_chat from "twitch-chat-client"
import * as zmq from "zeromq"
import { MessageTypes, Platform, InboundMessage, OutboundMessage } from "../../lib/types"

export async function run(name: string, hostport: string) {
    // TODO: flip over to proper promise error handling
    //    const pub = producer_connect(hostport).catch((err) => {
    //        console.error(`Twitch chat module ${name} failed to initialize at ${hostport}.`);
    //    });
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

    const authProvider = await twitch_auth.credentials_nanny.getApiClient();
    const chatClient = new twitch_chat.ChatClient(authProvider, { channels: ['happycerberus'] });
    await chatClient.connect();

    await pub.send([MessageTypes[MessageTypes.System], "Twitch chat connected"]);

    const messageListener = chatClient.onMessage(async (channel: string, user: string, message: string, msg: twitch_chat.PrivateMessage) => {
        await pub.send([MessageTypes[MessageTypes.InboundChat], JSON.stringify(new InboundMessage(Platform.Twitch, user, message))]);
    });

    const sub = new zmq.Subscriber;
    sub.connect("tcp://127.0.0.1:6667");
    sub.subscribe(MessageTypes[MessageTypes.OutboundChat]);
    for await (const [topic, msg] of sub) {
        let m = JSON.parse(msg.toString()) as OutboundMessage;
        if (m.platform == Platform.All || m.platform == Platform.Twitch) {
            chatClient.say("happycerberus", m.msg);
        }
    }
}