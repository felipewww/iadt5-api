import { NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { SyncGroupPermissionsCommand } from '@/domain/dtos/iam/groups/commands/sync-group-permissions.command';
import { IamGroupsRepository } from '@/application/iam/infra/db/postgres/iam-groups.repository';

type Input = { groupId: number; data: SyncGroupPermissionsCommand };

export class SyncGroupPermissionsHandler implements Handler<Input, void> {
    constructor(private readonly groupsRepository: IamGroupsRepository) {}

    async execute({ groupId, data }: Input): Promise<void> {
        const group = await this.groupsRepository.findById(groupId);
        if (!group) throw new NotFoundException('Grupo não encontrado');

        await this.groupsRepository.transaction((trx) =>
            this.groupsRepository.syncPermissions(groupId, data.permissionIds, trx),
        );
    }
}
