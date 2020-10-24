import { youtube_v3 } from "googleapis"

export class StreamInfo {
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
