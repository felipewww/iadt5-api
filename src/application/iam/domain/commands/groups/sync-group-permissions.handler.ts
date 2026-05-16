import { NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { SyncGroupPermissionsCommand } from '@/domain/dtos/iam/groups/commands/sync-group-permissions.command';
import { IamGroupsRepository } from '@/application/iam/infra/db/postgres/iam-groups.repository';
import { GroupPermissionsCache } from '@/infra/cache/group-permissions.cache';
import { ProducerRegistry } from '@/infra/rabbitmq/producer-registry.service';
import { GroupPermissionsUpdatedMessage } from '@/application/_rabbit-mq/messages/group-permissions-updated.message';
import { manifest } from '@/infra/manifest/manifest';

type Input = { groupId: number; data: SyncGroupPermissionsCommand };

export class SyncGroupPermissionsHandler implements Handler<Input, void> {
    constructor(
        private readonly groupsRepository: IamGroupsRepository,
        private readonly groupPermissionsCache: GroupPermissionsCache,
        private readonly producerRegistry: ProducerRegistry,
    ) {}

    async execute({ groupId, data }: Input): Promise<void> {
        const group = await this.groupsRepository.findById(groupId);
        if (!group) throw new NotFoundException('Grupo não encontrado');

        await this.groupsRepository.transaction((trx) =>
            this.groupsRepository.syncPermissions(groupId, data.permissionIds, trx),
        );

        const permissions = await this.groupsRepository.findPermissions(groupId);
        const permissionKeys = permissions.map((p) => `${p.module_id}:${p.action}`);

        this.groupPermissionsCache.set(groupId, permissionKeys);

        this.producerRegistry
            .get<GroupPermissionsUpdatedMessage>('PRODUCER_IAM')
            ?.publish({
                tenant: { id: manifest.tenatId, schema: manifest.uid, location: manifest.projectId },
                data: { groupId, permissionKeys },
            });
    }
}
