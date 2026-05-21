import { Inject, Logger, Module } from '@nestjs/common';
import { name as serviceName } from '../../../package.json';
import * as RabbitMQ from 'src/infra/framework/rabbitmq/module';
import { Exchanges } from '@/infra/rabbitmq/exchanges';
import { Queues } from '@/infra/rabbitmq/queues';
import { SampleMessage } from '@/infra/rabbitmq/messages/sample.message';
import { SampleConsumer } from '@/infra/rabbitmq/consumers/sample.consumer';
import { AuthSecretConsumer } from '@/infra/rabbitmq/consumers/auth-secret.consumer';
import { AuthSecretService } from '@/infra/auth/auth-secret.service';
import { AuthSecretRotatedMessage } from '@/infra/rabbitmq/messages/auth-secret-rotated.message';
import { NotificationMessage } from '@/infra/rabbitmq/messages/notification.message';
import { OcrRequestMessage } from '@/infra/rabbitmq/messages/ocr-request.message';
import { ProducerRegistry } from '@/infra/rabbitmq/producer-registry.service';

export interface Producers {
    PRODUCER_SAMPLE?: RabbitMQ.Producer<SampleMessage>;
    PRODUCER_NOTIFICATIONS?: RabbitMQ.Producer<NotificationMessage>;
    PRODUCER_OCR?: RabbitMQ.Producer<OcrRequestMessage>;
}

@Module({})
export class RabbitConnectorModule {
    public producers: Producers = {};
    private connectionString: string;

    constructor(
        @Inject(AuthSecretService) private readonly authSecretService: AuthSecretService,
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

        Queues.EVT_AUTH_SECRET_ROTATED.mount(serviceName, 'auth-secret');

        await consumersConn.init(
            [Exchanges.EXC_SAMPLE, Exchanges.EXC_AUTH_SECRET, Exchanges.EXC_NOTIFICATIONS, Exchanges.EXC_OCR],
            [
                new SampleConsumer(Queues.QUEUE_SAMPLE),
                new AuthSecretConsumer(Queues.EVT_AUTH_SECRET_ROTATED, this.authSecretService),
            ],
        );
    }

    async initProducers() {
        const producersConn = await new RabbitMQ.Connection('producers_conn', this.connectionString).init();

        this.producers.PRODUCER_SAMPLE = new RabbitMQ.Producer<SampleMessage>(Exchanges.EXC_SAMPLE, producersConn);

        const authSecretProducer = new RabbitMQ.Producer<AuthSecretRotatedMessage>(Exchanges.EXC_AUTH_SECRET, producersConn);
        this.producerRegistry.register('PRODUCER_AUTH_SECRET', authSecretProducer);

        this.producers.PRODUCER_NOTIFICATIONS = new RabbitMQ.Producer<NotificationMessage>(Exchanges.EXC_NOTIFICATIONS, producersConn);
        this.producerRegistry.register('PRODUCER_NOTIFICATIONS', this.producers.PRODUCER_NOTIFICATIONS);

        this.producers.PRODUCER_OCR = new RabbitMQ.Producer<OcrRequestMessage>(Exchanges.EXC_OCR, producersConn);
        this.producerRegistry.register('PRODUCER_OCR', this.producers.PRODUCER_OCR);
    }
}
