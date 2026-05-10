import {Queue} from './Queue'
import {Connection} from "./module";
import {Message} from "amqplib";
import Timeout = NodeJS.Timeout;
// import {InMemoryDataManager} from "./memory-loader/in-memory-data-manager";

export interface IConsumerLogger {
    log(e: Error, msg: Message): void;
}

export interface IMessagePattern<MESSAGE_BODY extends { [key: string]: any }> {
    tenant: {
        id: number,
        schema: string,
        location: number
    },
    data: MESSAGE_BODY
}

/**
 * Consumer só pode ser iniciado (consume()) dentro de uma connection
 */
export abstract class Consumer<MESSAGE_ESTRUCT> {

    protected rabbitConn: Connection;
    protected prefetch: number;
    protected waitTime: number;
    private waitTimeout: Timeout;

    protected _waitingAck: Array<Message> = [];
    protected _waitingRej: Array<Message> = [];

    constructor(
        protected Queue: Queue,
    ) {

    }

    public async init(rabbitConn: Connection) {
        this.rabbitConn = rabbitConn;

        // todo - remover eslint-disables e corrigir
        if (this.prefetch) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
            await this.rabbitConn.channel.prefetch(this.prefetch);
        }

        if (!this.Queue) {
            console.log(`${this.constructor.name} queue does not exist`)
            return;
        }

        await this.Queue.addConsumer(this);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        await this.rabbitConn.channel.consume(
            this.Queue.name,
            (msg: Message) => { this.onMessage(msg) },
            { exclusive: false, noAck: false }
        );

        // devolver prefetch padrão
        if (this.prefetch) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
            await this.rabbitConn.channel.prefetch(1);
        }
    }

    private ackWaitingMessages() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        for (const msg of this._waitingAck) { this.rabbitConn.channel.ack(msg); }
        this._waitingAck = [];


        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
        for (const msg of this._waitingRej) { this.rabbitConn.channel.reject(msg, (!msg.fields.redelivered)); }
        this._waitingRej = []

        this.waitTimeout = null;
    }

    async onMessage(msg: Message) {
        if (this.waitTime) {
            if (!this.waitTimeout) {
                this.waitTimeout = setTimeout(() => {
                    this.ackWaitingMessages()
                }, this.waitTime);
            }
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
            const message = JSON.parse(msg.content.toString()) as IMessagePattern<MESSAGE_ESTRUCT>;
            await this.handler(message);

            // eslint-disable-next-line @typescript-eslint/no-unused-expressions,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
            (this.waitTime) ? this._waitingAck.push(msg) : this.rabbitConn.channel.ack(msg);
        } catch (e) {
            console.log(e, msg);
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            (this.waitTime)
                ? this._waitingRej.push(msg)
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
                : this.rabbitConn.channel.reject(msg, (!msg.fields.redelivered));
        }
    }

    protected abstract handler(message: IMessagePattern<MESSAGE_ESTRUCT>): Promise<any>
}
