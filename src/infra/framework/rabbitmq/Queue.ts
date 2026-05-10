import {Connection} from "./Connection";
import {Consumer} from "./Consumer";
import {Exchange} from "./Exchange";
import {DEAD_LETTER_EXC_NAME} from "./module";

export class Queue {

    public routingkey = '';
    private _consumers: Array<Consumer<any>> = []

    protected durable = true;
    protected exclusive = false;

    // por padrão, as queues são round robin, tendo multiplos consumers
    // fazendo load balance entre as mensagens
    // mas alguns casos queremos multiplos consumers recebendo a mesma mensagem
    // enviada para uma exchange (ex: multiplos servidores recebendo update de whitelists)
    // cada servidor precisa ter a sua queue
    protected type: 'round-robin'|'propagation' = 'round-robin'

    constructor(
        protected Name: string,
        protected Exchange: Exchange
    ) {
        if (!this.Exchange) {
            console.log(`Exchange for ${this.constructor.name} does not exist`);
            console.log(typeof this);
            return;
        }

        this.Exchange.addQueue(this);
    }

    async init(RabbitConn: Connection) {
        const createdQueue = await RabbitConn.channel.assertQueue(
            this.Name,
            {
                durable: this.durable,
                deadLetterExchange: DEAD_LETTER_EXC_NAME,
                exclusive: this.exclusive,
            })

        if (this.type === 'propagation' && createdQueue.consumerCount >= 1) {
            console.log("Unique queue can't have more than one consumer")
            process.kill(0)
        }
    }

    async checkQueue(conn: Connection) {
        return new Promise((resolve, reject) => {
            conn.channel.on('error', (err: Error) => {
                console.log('Error catched!')
                console.log(err)
            })
                .checkQueue(this.Name)
                .then(res => {})
                .catch(reason => {
                    console.log('reason??')
                    console.log(reason)
                })
        })
    }

    get name() {
        return this.Name
    }

    public get exchange() {
        return this.Exchange
    }

    async addConsumer(consumer: Consumer<any>) {

        /**
         * Por regras do rabbitmq, se uma fila pertencer a um exchange "fanout", ela só pode terum consumer.
         * Para múltiplas consumers da mesma exchange é necessário uma fila pra cada consumer
         *
         * https://www.rabbitmq.com/tutorials/amqp-concepts.html
         *
         * todo - podem haver outras regras, foi implementada apenas do tipo fanout
         */
        if (this.Exchange.type === 'fanout' && this._consumers.length) {
            throw new Error('Consumers Exceeded:\n Exchange Fanout type can have only one consumer per queue.\n Consider create a new queue to the same exchange')
        }

        this._consumers.push(consumer);
    }
}

export class EventQueue extends Queue {
    protected type: 'propagation' = 'propagation'
    protected durable = false;
    protected exclusive = true;

    // Event are listening by multiple server and should run mount() to identify server and service
    constructor(
        Exchange: Exchange
    ) {
        super(null, Exchange);
    }

    mount(
        serviceName: string,
        serverId: string,
    ) {
        const queueClassName = this.constructor.name.toLowerCase().replace('queue', '');
        this.Name = `evt-${queueClassName}-${serviceName}-${serverId}`;

        return this;
    }
}
