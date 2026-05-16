import { Inject, Logger, Module } from '@nestjs/common';
import * as RabbitMQ from 'src/infra/framework/rabbitmq/module';
import { Exchanges } from 'src/application/_rabbit-mq/exchanges';
import { Queues } from 'src/application/_rabbit-mq/queues';
import { SampleMessage } from '@/application/_rabbit-mq/messages/sample.message';
import { SampleConsumer } from '@/application/_rabbit-mq/consumers/sample.consumer';
import { GroupPermissionsUpdatedConsumer } from '@/application/_rabbit-mq/consumers/group-permissions-updated.consumer';
import { GroupPermissionsCache } from '@/infra/cache/group-permissions.cache';
import { ProducerRegistry } from '@/infra/rabbitmq/producer-registry.service';
import { GroupPermissionsUpdatedMessage } from '@/application/_rabbit-mq/messages/group-permissions-updated.message';

export interface Producers {
    PRODUCER_SAMPLE?: RabbitMQ.Producer<SampleMessage>;
}

@Module({})
export class RabbitConnectorModule {
    public producers: Producers = {};
    private connectionString: string;

    constructor(
        @Inject(GroupPermissionsCache) private readonly groupPermissionsCache: GroupPermissionsCache,
        @Inject(ProducerRegistry) private readonly producerRegistry: ProducerRegistry,
    ) {}

    async onModuleInit() {
        const user = process.env.RMQ_USER;
        const pass = process.env.RMQ_PASS;
        const host = process.env.RMQ_HOST;
        this.connectionString = `amqp://${user}:${pass}@${host}`;

        try {
            await this.initConsumers().then(() => {
                Logger.log(`rabbitmq consumers connected`);
            });

            await this.initProducers().then(() => {
                Logger.log(`rabbitmq producers connected`);
            });
        } catch (e) {
            Logger.error('Error while init producers or consumers');
            Logger.error(e);
        }
    }

    async initConsumers(): Promise<void> {
        const consumersConn = new RabbitMQ.Connection('consumers_conn', this.connectionString);

        Queues.EVT_GROUP_PERMISSIONS_UPDATED.mount('api', crypto.randomUUID());

        await consumersConn.init(
            [Exchanges.EXC_SAMPLE, Exchanges.EXC_IAM],
            [
                new SampleConsumer(Queues.QUEUE_SAMPLE),
                new GroupPermissionsUpdatedConsumer(Queues.EVT_GROUP_PERMISSIONS_UPDATED, this.groupPermissionsCache),
            ],
        );
    }

    async initProducers() {
        const producersConn = await new RabbitMQ.Connection('producers_conn', this.connectionString).init();

        this.producers.PRODUCER_SAMPLE = new RabbitMQ.Producer<SampleMessage>(Exchanges.EXC_SAMPLE, producersConn);

        const iamProducer = new RabbitMQ.Producer<GroupPermissionsUpdatedMessage>(Exchanges.EXC_IAM, producersConn);
        this.producerRegistry.register('PRODUCER_IAM', iamProducer);
    }
}
