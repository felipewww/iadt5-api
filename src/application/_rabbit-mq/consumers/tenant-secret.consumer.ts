import { IMessagePattern } from '@/infra/framework/rabbitmq/Consumer';
import { Consumer } from '@/infra/framework/rabbitmq/module';
import { TenantSecretChangeMessage } from '@/application/_rabbit-mq/messages/tenant-secret-change.message';

export class TenantSecretConsumer extends Consumer<TenantSecretChangeMessage> {
    protected async handler(
        message: IMessagePattern<TenantSecretChangeMessage>,
    ) {
        // const memoryTenantSecretInstance = getMemoryTenantSecret()
        //
        // memoryTenantSecretInstance.upgrade(
        //     message.data.tenantId,
        //     message.data.secretAccess,
        //     message.data.secretRefresh,
        // )
        await Promise.resolve();

        return true;
    }
}
