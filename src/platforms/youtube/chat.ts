import { youtube_v3 } from "googleapis"
import * as youtube_auth from "./auth"
import * as zmq from "zeromq"
import { MessageTypes, Platform, InboundMessage, OutboundMessage, StatsLatestFollower, StatsFollowers, StatsViewers } from "../../lib/types"
import { PublisherQueue } from "../../lib/publisher_queue"
import { StreamInfo } from "./youtube_lib"

class ChatMessage {
    constructor(public displayName: string, public displayMessage: string) { }
}

class ChatContent {
    constructor(public chatMessages: Array<ChatMessage>, public nextPageToken: string, public pollingIntervalMillis: number) { }
    static async fetchChat(client: youtube_v3.Youtube, chatId: string, nextPage?: string): Promise<ChatContent> {
        return new Promise<ChatContent>((resolve, reject) => {
            client.liveChatMessages.list({ part: ["id", "snippet", "authorDetails"], liveChatId: chatId, pageToken: nextPage }).then((resp) => {
                // Potential TODO: authorDetails.profileImageUrl
                const messages = new Array<ChatMessage>();
                if (resp.data.items === undefined) {
                    throw new Error("YouTube response missing items.");
                }
                if (resp.data.nextPageToken === undefined ||
                    resp.data.nextPageToken === null ||
                    resp.data.pollingIntervalMillis === undefined ||
                    resp.data.pollingIntervalMillis === null) {
                    throw new Error("YouTube response missing polling data.");
                }
                for (const i of resp.data.items) {
                    if (i.snippet === undefined ||
                        i.snippet.type === undefined ||
                        i.snippet.type === null) {
                        throw new Error("YouTube response missing required snippet information.");
                    }
                    if (i.snippet.type !== "textMessageEvent") {
                        continue;
                    }
                    if (i.snippet.displayMessage === undefined ||
                        i.snippet.displayMessage === null ||
                        i.authorDetails === undefined ||
                        i.authorDetails.displayName === undefined ||
                        i.authorDetails.displayName === null) {
                        throw new Error("YouTube response missing required message data.");
                    }
                    messages.push(new ChatMessage(i.authorDetails.displayName, i.snippet.displayMessage));
                }
                resolve(new ChatContent(messages, resp.data.nextPageToken, resp.data.pollingIntervalMillis));
            }).catch((err) => {
                reject(err);
            });
        });
    }
}

async function receiveMessages(client: youtube_v3.Youtube, chatId: string, pubQueue: PublisherQueue) {
    let nextPage: string | undefined = undefined;
    while (true) {
        let chatContent = await ChatContent.fetchChat(client, chatId, nextPage);

        for (const m of chatContent.chatMessages) {
            pubQueue.send(MessageTypes[MessageTypes.InboundChat], JSON.stringify(new InboundMessage(Platform.Youtube, m.displayName, m.displayMessage)));
        }

        nextPage = chatContent.nextPageToken;
        await new Promise(resolve => setTimeout(resolve, chatContent.pollingIntervalMillis));
    }
}

export async function run(name: string, hostport: string) {
    const pub = new zmq.Publisher;
    await pub.bind(hostport);

    let pubQueue = new PublisherQueue(pub);
    pubQueue.run();

    const sock = new zmq.Request;
    sock.connect("tcp://127.0.0.1:6666");
    await sock.send(hostport);
    const [msg] = await sock.receive();
    if (msg.toString() !== "ACK") {
        console.error(`Module ${name} | Something weird happened.`);
    } else {
        console.log(`Module ${name} | Recevied confirmation from backbone.`);
    }

    const authProvider = await youtube_auth.credentials_nanny.getApiClient();
    const client = new youtube_v3.Youtube({ auth: authProvider });

    let resp = await StreamInfo.fetchInfo(client);
    pubQueue.send(MessageTypes[MessageTypes.System], `Youtube Chat connected.`);
    receiveMessages(client, resp.chatId, pubQueue);

    const sub = new zmq.Subscriber;
    sub.connect("tcp://127.0.0.1:6667");
    sub.subscribe(MessageTypes[MessageTypes.OutboundChat]);
    for await (const [topic, msg] of sub) {
        let m = JSON.parse(msg.toString()) as OutboundMessage;
        if (m.platform == Platform.All || m.platform == Platform.Youtube) {
            client.liveChatMessages.insert({ part: ["snippet"], requestBody: { snippet: { liveChatId: resp.chatId, type: "textMessageEvent", textMessageDetails: { messageText: m.msg } } } });
        }
    }
}