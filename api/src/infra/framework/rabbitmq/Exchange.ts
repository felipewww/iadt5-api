import {Connection} from "./Connection";
import {Queue} from "./Queue";
import { manifest } from '@/infra/manifest/manifest';

export class Exchange {

    public name: string;
    protected _queues: Array<Queue> = [];

    get queues() {
        return this._queues;
    }

    constructor(
        name: string,
        public type: 'direct' | 'topic' | 'headers' | 'fanout' | 'match' = 'fanout'
    ) {
        this.name = `${manifest.uid}_${name}`;
    }

    public async init(RabbitConn: Connection){
        await RabbitConn.channel.assertExchange(
            this.name,
            this.type,
            {
                durable: true
            }
        )

        for (const queue of this._queues) {
            await queue.init(RabbitConn)
            await RabbitConn.channel.bindQueue(queue.name, this.name, queue.routingkey);
        }
    }

    public addQueue(queue: Queue) {
        this._queues.push(queue);
    }
}
