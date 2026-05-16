import { IMessagePattern } from '@/infra/framework/rabbitmq/Consumer';
import { Consumer } from '@/infra/framework/rabbitmq/module';
import { SampleMessage } from '@/infra/rabbitmq/messages/sample.message';

export class SampleConsumer extends Consumer<SampleMessage> {
    protected async handler(
        message: IMessagePattern<SampleMessage>,
    ) {
        await Promise.resolve();

        return true;
    }
}
