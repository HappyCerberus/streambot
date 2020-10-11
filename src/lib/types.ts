export enum MessageTypes {
    System,
    InboundChat,
    OutboundChat,
    StreamStatsViewers,
    StreamStatsFollowers,
    StreamStatsLatestFollower,
}

/**
 * Supported platforms.
 */
export enum Platform {
    All,
    Twitch,
    Youtube
}

export interface StatsViewers {
    kind: "viewers"
    platform: Platform
    viewers: number
}

// Youtube Subscribers / Twitch Followers
export interface StatsFollowers {
    kind: "followers"
    platform: Platform
    followers: number
}

export interface StatsLatestFollower {
    kind: "last_follower"
    platform: Platform
    latest_follower: string
}

export type Stats = StatsViewers | StatsFollowers | StatsLatestFollower;

export class InboundMessage {
    constructor(public platform: Platform, public user: string, public msg: string) { };
}

export class OutboundMessage {
    constructor(public platform: Platform, public msg: string) { }
}

export class StreamStatsMessage {
    constructor(public platform: Platform, public type: Stats) { }
}
