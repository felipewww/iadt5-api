import * as RabbitMQ from 'src/infra/framework/rabbitmq/module';
import { Exchanges } from 'src/application/_rabbit-mq/exchanges';

interface IQueues extends RabbitMQ.IQueuesDefinitions {
  TENANT_SECRET: RabbitMQ.Queue
}
export const Queues: IQueues = {
  TENANT_SECRET: new RabbitMQ.Queue('tenant-secret-queue', Exchanges.TENANT_SECRET),
}
