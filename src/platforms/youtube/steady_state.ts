// This file contains the inbound module for youtube steady state information.

import { youtube_v3 } from "googleapis"
import * as youtube_auth from "./auth"
import * as zmq from "zeromq"
import { MessageTypes, Platform, InboundMessage, OutboundMessage, StatsLatestFollower, StatsFollowers, StatsViewers } from "../../lib/types"
import { PublisherQueue } from "../../lib/publisher_queue"
import { rejects } from "assert"

function zeroOrValue(x: string | null | undefined): number {
    if (x === undefined) return 0;
    if (x === null) return 0;
    return Number(x);
}

class StreamInfo {
    constructor(public videoId: string, public chatId: string) { }
    static async fetchInfo(client: youtube_v3.Youtube): Promise<StreamInfo> {
        return new Promise<StreamInfo>((resolve, reject) => {
            client.liveBroadcasts.list({ part: ["id", "snippet", "status"], broadcastStatus: "active" }).then((resp) => {
                if (resp.data.items === undefined ||
                    resp.data.items[0] === undefined ||
                    resp.data.items[0].status === undefined ||
                    resp.data.items[0].status.lifeCycleStatus !== "live" ||
                    resp.data.items[0].id === undefined ||
                    resp.data.items[0].id === null ||
                    resp.data.items[0].snippet === undefined ||
                    resp.data.items[0].snippet.liveChatId === undefined ||
                    resp.data.items[0].snippet.liveChatId === null) {
                    throw new Error("Unexpected response from Youtube.");
                }
                resolve(new StreamInfo(resp.data.items[0].id, resp.data.items[0].snippet.liveChatId));
            }).catch((err) => {
                reject(err);
            });
        });
    }
}

class SubStats {
    constructor(public subCount: number, public latestSub: string) { }
    static async fetchStats(client: youtube_v3.Youtube): Promise<SubStats> {
        return new Promise<SubStats>((resolve) => {
            client.subscriptions.list({ part: ["subscriberSnippet"], myRecentSubscribers: true }).then((resp) => {
                if (resp.data.pageInfo === undefined ||
                    resp.data.pageInfo.totalResults === undefined ||
                    resp.data.pageInfo.totalResults === null ||
                    resp.data.items === undefined ||
                    resp.data.items[0] === undefined ||
                    resp.data.items[0].subscriberSnippet === undefined ||
                    resp.data.items[0].subscriberSnippet.title === undefined ||
                    resp.data.items[0].subscriberSnippet.title === null) {
                    throw new Error("Unexpected response from Youtube.");
                }
                resolve(new SubStats(
                    resp.data.pageInfo.totalResults,
                    resp.data.items[0].subscriberSnippet.title
                ));
            }).catch((err) => {
                console.error(`Failed to fetch channels stats : ${err}`);
                resolve(new SubStats(0, ""));
            });
        });
    }
}

class VideoStats {
    constructor(public viewCount: number, public likeCount: number,
        public dislikeCount: number, public concurrentViewers: number,
        public commentCount: number) { }

    static async fetchStats(client: youtube_v3.Youtube, videoId: string): Promise<VideoStats> {
        return new Promise<VideoStats>((resolve) => {
            client.videos.list({
                part: ["liveStreamingDetails", "statistics"], id: [videoId]
            }).then((resp) => {
                if (resp.data.items === undefined ||
                    resp.data.items[0] === undefined ||
                    resp.data.items[0].liveStreamingDetails === undefined ||
                    resp.data.items[0].statistics === undefined) {
                    throw new Error("Unexpected response from Youtube.");
                }
                resolve(new VideoStats(zeroOrValue(resp.data.items[0].statistics.viewCount),
                    zeroOrValue(resp.data.items[0].statistics.likeCount),
                    zeroOrValue(resp.data.items[0].statistics.dislikeCount),
                    zeroOrValue(resp.data.items[0].liveStreamingDetails.concurrentViewers),
                    zeroOrValue(resp.data.items[0].statistics.commentCount)));
            }).catch((err) => {
                console.error(`Failed to fetch video stats ${err}.`);
                resolve(new VideoStats(0, 0, 0, 0, 0));
            });
        });
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
    pubQueue.send(MessageTypes[MessageTypes.System], `Youtube steady state connected.`);

    while (true) {
        let vidResp = await VideoStats.fetchStats(client, resp.videoId);
        let subResp = await SubStats.fetchStats(client);

        const follower_msg = `${JSON.stringify({ platform: Platform.Youtube, latest_follower: subResp.latestSub } as StatsLatestFollower)}`;
        const followers_msg = `${JSON.stringify({ platform: Platform.Youtube, followers: subResp.subCount } as StatsFollowers)}`;
        const viewers_msg = `${JSON.stringify({ platform: Platform.Youtube, viewers: vidResp.concurrentViewers } as StatsViewers)}`;
        pubQueue.send(MessageTypes[MessageTypes.StreamStatsLatestFollower], follower_msg);
        pubQueue.send(MessageTypes[MessageTypes.StreamStatsFollowers], followers_msg);
        pubQueue.send(MessageTypes[MessageTypes.StreamStatsViewers], viewers_msg);

        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}