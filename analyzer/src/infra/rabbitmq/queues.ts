import * as RabbitMQ from 'src/infra/framework/rabbitmq/module';
import { Exchanges } from '@/infra/rabbitmq/exchanges';

interface IQueues extends RabbitMQ.IQueuesDefinitions {
    QUEUE_ANALYZER: RabbitMQ.Queue;
}

export const Queues: IQueues = {
    QUEUE_ANALYZER: new RabbitMQ.Queue('queue-analyzer', Exchanges.EXC_ANALYZER),
};
