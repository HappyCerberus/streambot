import { parse } from "path"
import * as zmq from "zeromq"
import * as m from "../lib/types"
import * as ws from "ws"

class StreamStatsData {
    constructor(public twitch_viewers: number,
        public twitch_followers: number,
        public twitch_latest_follower: string,
        public youtube_viewers: number,
        public youtube_followers: number,
        public youtube_latest_follower: string) { }
}

let latest_stats = new StreamStatsData(0, 0, "", 0, 0, "");

async function periodic_export(socket: ws) {
    while (true) {
        // serialize current latest_stats and send on the socket
        let msg = JSON.stringify(latest_stats);
        socket.send(msg);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

export async function run(name: string, hostport: string) {
    const sub = new zmq.Subscriber;
    sub.connect("tcp://127.0.0.1:6667");
    sub.subscribe();

    const wss = new ws.Server({
        port: 9000,
    });
    wss.on("error", (error: Error) => {
        console.log(`Socket error ${error}`);
    });
    wss.on("connection", (socket: ws, request: ws.MessageEvent) => {
        console.log(`Received connection on socket ${request.data}`);
        periodic_export(socket);
    });
    wss.on("close", () => {
        console.log(`Socket disconnected.`);
    });

    for await (const [topic, msg] of sub) {
        try {
            switch (topic.toString()) {
                case m.MessageTypes[m.MessageTypes.TextToSpeech]:
                    wss.clients.forEach((client) => {
                        if (client.readyState === ws.OPEN) {
                            console.log("Trying to send message to client.");
                            client.send(msg.toString());
                        } else {
                            console.error("Client not ready to receive data.");
                        }
                    });
                    break;
                case m.MessageTypes[m.MessageTypes.StreamStatsFollowers]:
                    let followers = JSON.parse(msg.toString()) as m.StatsFollowers;
                    switch (followers.platform) {
                        case m.Platform.Twitch:
                            latest_stats.twitch_followers = followers.followers;
                            break;
                        case m.Platform.Youtube:
                            latest_stats.youtube_followers = followers.followers;
                            break;
                    }
                    break;
                case m.MessageTypes[m.MessageTypes.StreamStatsLatestFollower]:
                    let latest_follower = JSON.parse(msg.toString()) as m.StatsLatestFollower;
                    switch (latest_follower.platform) {
                        case m.Platform.Twitch:
                            latest_stats.twitch_latest_follower = latest_follower.latest_follower;
                            break;
                        case m.Platform.Youtube:
                            latest_stats.youtube_latest_follower = latest_follower.latest_follower;
                            break;
                    }
                    break;
                case m.MessageTypes[m.MessageTypes.StreamStatsViewers]:
                    let viewers = JSON.parse(msg.toString()) as m.StatsViewers;
                    switch (viewers.platform) {
                        case m.Platform.Twitch:
                            latest_stats.twitch_viewers = viewers.viewers;
                            break;
                        case m.Platform.Youtube:
                            latest_stats.youtube_viewers = viewers.viewers;
                            break;
                    }
                    break;

            }
        } catch (err) {
            console.log(`Failed to parse message ${msg.toString()} : ${err}`);
        }
    }
}