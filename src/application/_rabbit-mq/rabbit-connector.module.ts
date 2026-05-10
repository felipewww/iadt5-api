import { Inject, Injectable, Logger, Module } from '@nestjs/common';
import * as RabbitMQ from 'src/infra/framework/rabbitmq/module';
import { Exchanges } from 'src/application/_rabbit-mq/exchanges';
import { Queues } from 'src/application/_rabbit-mq/queues';
import { TenantSecretChangeMessage } from 'src/application/_rabbit-mq/messages/tenant-secret-change.message';
import { TenantSecretConsumer } from 'src/application/_rabbit-mq/consumers/tenant-secret.consumer';

export interface Producers {
    TENANT_SECRET_CHANGE?: RabbitMQ.Producer<TenantSecretChangeMessage>;
}

@Module({})
export class RabbitConnectorModule {
    public producers: Producers = {};

    async onModuleInit() {
        const user = process.env.RMQ_USER;
        const pass = process.env.RMQ_PASS;
        const host = process.env.RMQ_HOST;
        const connectionString = `amqp://${user}:${pass}@${host}`;

        try {
            await this.initConsumers(connectionString).then(() => {
                Logger.log(`rabbitmq consumers connected`);
            });

            await this.initProducers(connectionString).then(() => {
                Logger.log(`rabbitmq producers connected`);
            });
        } catch (e) {
            Logger.error('Error while init producers or consumers');
            Logger.error(e);
        }
    }

    async initConsumers(connectionString: string): Promise<void> {
        const consumersConn = new RabbitMQ.Connection(
            'consumers_conn',
            connectionString,
        );

        await consumersConn.init(
            [
                Exchanges.TENANT_SECRET
            ],
            [
                new TenantSecretConsumer(Queues.TENANT_SECRET)
            ],
        );
    }

    async initProducers(connectionString: string) {
        const producersConn = await new RabbitMQ.Connection(
            'producers_conn',
            connectionString,
        ).init();

        this.producers.TENANT_SECRET_CHANGE =
            new RabbitMQ.Producer<TenantSecretChangeMessage>(
                Exchanges.TENANT_SECRET,
                producersConn,
            );
    }
}
