import * as RabbitMQ from 'src/infra/framework/rabbitmq/module';
import { Exchanges } from '@/infra/rabbitmq/exchanges';

interface IQueues extends RabbitMQ.IQueuesDefinitions {
    QUEUE_SAMPLE: RabbitMQ.Queue;
    EVT_AUTH_SECRET_ROTATED: RabbitMQ.EventQueue;
    QUEUE_OCR: RabbitMQ.Queue;
}

export const Queues: IQueues = {
    QUEUE_SAMPLE: new RabbitMQ.Queue('queue-sample', Exchanges.EXC_SAMPLE),
    EVT_AUTH_SECRET_ROTATED: new RabbitMQ.EventQueue(Exchanges.EXC_AUTH_SECRET),
    QUEUE_OCR: new RabbitMQ.Queue('queue-ocr', Exchanges.EXC_OCR),
};
