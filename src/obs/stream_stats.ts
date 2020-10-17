import { parse } from "path"
import * as zmq from "zeromq"
import * as m from "../lib/types"
import * as ws from "ws"

class StreamStatsData {
    constructor(public twitch_viewers: number,
        public twitch_followers: number,
        public twitch_latest_follower: string) { }
}

let latest_stats = new StreamStatsData(0, 0, "");

async function periodic_export(socket: ws) {
    while (true) {
        // serialize current latest_stats and send on the socket
        socket.send("hello world!");
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}


export async function run(name: string, hostport: string) {
    const sub = new zmq.Subscriber;
    sub.connect("tcp://127.0.0.1:6667");
    sub.subscribe();

    const sock = new ws.Server({
        port: 3000,
    });
    sock.on("error", (error: Error) => {
        console.log(`Socket error ${error}`);
    });
    sock.on("connection", (socket: ws, request: ws.MessageEvent) => {
        console.log(`Received connection on socket ${request}`);
        periodic_export(socket);
    });
    sock.on("close", () => {
        console.log(`Socket disconnected.`);
    });


    sock.on('connection', periodic_export);
    /*
        for await (const [topic, msg] of sub) {
            try {
                switch (topic.toString()) {
                    case m.MessageTypes[m.MessageTypes.StreamStatsFollowers]:
                        let followers = JSON.parse(msg.toString()) as m.StatsFollowers;
                        switch (followers.platform) {
                            case m.Platform.Twitch:
                                latest_stats.twitch_followers = followers.followers;
                                break;
                        }
                        break;
                    case m.MessageTypes[m.MessageTypes.StreamStatsLatestFollower]:
                        let latest_follower = JSON.parse(msg.toString()) as m.StatsLatestFollower;
                        switch (latest_follower.platform) {
                            case m.Platform.Twitch:
                                latest_stats.twitch_latest_follower = latest_follower.latest_follower;
                                break;
                        }
                        break;
                    case m.MessageTypes[m.MessageTypes.StreamStatsViewers]:
                        let viewers = JSON.parse(msg.toString()) as m.StatsViewers;
                        switch (viewers.platform) {
                            case m.Platform.Twitch:
                                latest_stats.twitch_viewers = viewers.viewers;
                                break;
                        }
                        break;
    
                }
            } catch (err) {
                console.log(`Failed to parse message ${msg.toString()} : ${err}`);
            }
        }*/
}