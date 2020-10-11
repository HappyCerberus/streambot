import * as zmq from "zeromq"

export class PublisherQueue {
    private queue: Buffer[][] = []
    constructor(private publisher: zmq.Publisher) { }

    private static toBuffer(value: Buffer | string): Buffer {
        if (value instanceof Buffer) {
            return value as Buffer;
        } else {
            return Buffer.from(value as string);
        }
    }

    send(topic: Buffer | string, msg: Buffer | string) {
        this.queue.push([PublisherQueue.toBuffer(topic), PublisherQueue.toBuffer(msg)]);
    }

    async run() {
        while (true) {
            if (this.queue.length > 0) {
                let msg = this.queue.shift();
                if (msg !== undefined) {
                    await this.publisher.send(msg);
                }
            } else {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
    }
}