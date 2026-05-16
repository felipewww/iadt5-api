import * as RabbitMQ from 'src/infra/framework/rabbitmq/module';
import { Exchanges } from 'src/application/_rabbit-mq/exchanges';

interface IQueues extends RabbitMQ.IQueuesDefinitions {
    QUEUE_SAMPLE: RabbitMQ.Queue;
    EVT_GROUP_PERMISSIONS_UPDATED: RabbitMQ.EventQueue;
}

export const Queues: IQueues = {
    QUEUE_SAMPLE: new RabbitMQ.Queue('queue-sample', Exchanges.EXC_SAMPLE),
    EVT_GROUP_PERMISSIONS_UPDATED: new RabbitMQ.EventQueue(Exchanges.EXC_IAM),
};
