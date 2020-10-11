// This file contains the inbound module for twitch steady state information.

import * as twitch_auth from "./auth"
import * as twitch from "twitch"
import * as zmq from "zeromq"
import * as settings from "./globals"
import { MessageTypes, Platform, InboundMessage, OutboundMessage, StatsLatestFollower, StatsFollowers, StatsViewers } from "../../lib/types"
import { PublisherQueue } from "../../lib/publisher_queue"

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

    const authProvider = await twitch_auth.credentials_nanny.getApiClient();

    const client = new twitch.ApiClient({ authProvider });

    let user = await client.helix.users.getMe();

    pubQueue.send(MessageTypes[MessageTypes.System], `Twitch steady state connected.`);

    while (true) {
        let complete_follows = await client.helix.users.getFollows({ followedUser: user });
        let last_follower = await complete_follows.data[0].getUser();
        const follower = last_follower === null ? "" : last_follower.name;
        let my_stream = await user.getStream();
        let viewers = 0;
        if (my_stream)
            viewers = my_stream.viewers;

        const follower_msg = `${JSON.stringify({ platform: Platform.Twitch, latest_follower: follower } as StatsLatestFollower)}`;
        const followers_msg = `${JSON.stringify({ platform: Platform.Twitch, followers: complete_follows.total } as StatsFollowers)}`;
        const viewers_msg = `${JSON.stringify({ platform: Platform.Twitch, viewers: viewers } as StatsViewers)}`;
        pubQueue.send(MessageTypes[MessageTypes.StreamStatsLatestFollower], follower_msg);
        pubQueue.send(MessageTypes[MessageTypes.StreamStatsFollowers], followers_msg);
        pubQueue.send(MessageTypes[MessageTypes.StreamStatsViewers], viewers_msg);

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}