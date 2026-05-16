import { IMessagePattern, Consumer } from '@/infra/framework/rabbitmq/Consumer';
import { Queue } from '@/infra/framework/rabbitmq/Queue';
import { GroupPermissionsCache } from '@/infra/cache/group-permissions.cache';
import { GroupPermissionsUpdatedMessage } from '@/infra/rabbitmq/messages/group-permissions-updated.message';

export class GroupPermissionsUpdatedConsumer extends Consumer<GroupPermissionsUpdatedMessage> {
    constructor(
        queue: Queue,
        private readonly groupPermissionsCache: GroupPermissionsCache,
    ) {
        super(queue);
    }

    protected async handler(message: IMessagePattern<GroupPermissionsUpdatedMessage>): Promise<void> {
        const { groupId, permissionKeys } = message.data;
        this.groupPermissionsCache.set(groupId, permissionKeys);
    }
}
