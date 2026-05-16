import * as RabbitMQ from 'src/infra/framework/rabbitmq/module';
import { Exchanges } from 'src/application/_rabbit-mq/exchanges';

interface IQueues extends RabbitMQ.IQueuesDefinitions {
  QUEUE_SAMPLE: RabbitMQ.Queue
}
export const Queues: IQueues = {
    QUEUE_SAMPLE: new RabbitMQ.Queue(
        'queue-sample',
        Exchanges.EXC_SAMPLE,
    ),
};
