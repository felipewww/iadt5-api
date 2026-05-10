import * as amqp from "amqplib";
import {Channel} from "amqplib";
import {Consumer} from "./Consumer";
import {Exchange} from "./Exchange";

export class Connection {
    private Channel: Channel;

    get channel() {
        return this.Channel;
    }

    constructor(
        private name: string,
        private host: string,
    ) {

    }

    async init(
        exchanges: Array<Exchange> = [],
        consumers: Array<Consumer<any>> = [],
    ): Promise<Connection> {
        const rabbitConnection = await amqp.connect(this.host);

        this.Channel = await rabbitConnection.createChannel()

        this.channel
            .on('error', (err: Error) => {

            })
            // .on('')
        
        await this.Channel.prefetch(1)

        for (let exc of exchanges) {
            await exc.init(this)
        }

        for (let consumer of consumers) {
            await consumer.init(this);
        }

        return this;
    }
}
