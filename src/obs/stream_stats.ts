import { parse } from "path"
import * as zmq from "zeromq"
import * as m from "../lib/types"
import * as socketio from "socket.io"
import * as http from "http"

class StreamStatsData {
    constructor(public twitch_viewers: number,
        public twitch_followers: number,
        public twitch_latest_follower: string) { }
}

let latest_stats = new StreamStatsData(0, 0, "");

async function periodic_export() {
    const socket = socketio(3000);
    while (true) {
        // serialize current latest_stats and send on the socket
        socket.emit("hello world!");
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}


export async function run(name: string, hostport: string) {
    const sub = new zmq.Subscriber;
    sub.connect("tcp://127.0.0.1:6667");
    sub.subscribe();

    periodic_export();

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
    }
}