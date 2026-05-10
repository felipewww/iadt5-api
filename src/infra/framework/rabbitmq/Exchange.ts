import {Connection} from "./Connection";
import {Queue} from "./Queue";

export class Exchange {

    protected _queues: Array<Queue> = [];

    get queues() {
        return this._queues;
    }

    constructor(
        public name: string,
        public type: 'direct' | 'topic' | 'headers' | 'fanout' | 'match' = 'fanout'
    ) {
    }

    public async init(RabbitConn: Connection){
        await RabbitConn.channel.assertExchange(
            this.name,
            this.type,
            {
                durable: true
            }
        )

        for (let queue of this._queues) {
            await queue.init(RabbitConn)
            await RabbitConn.channel.bindQueue(queue.name, this.name, queue.routingkey);
        }
    }

    public addQueue(queue: Queue) {
        this._queues.push(queue);
    }
}
