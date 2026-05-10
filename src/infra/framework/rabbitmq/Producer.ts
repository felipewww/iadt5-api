import {Exchange} from "./Exchange";
import {Connection} from "./Connection";
import {IMessagePattern} from "./Consumer";

export class Producer<T> {
    constructor(
        protected exchange: Exchange,
        protected connection: Connection,
    ) {}

    publish(msg: IMessagePattern<T>): void {
        this.connection.channel.publish(
            this.exchange.name,
            '',
            Buffer.from(JSON.stringify(msg)),
            {
                persistent: true,
            }
        )
    }
}
