import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { SyncGroupPermissionsCommand } from '@/domain/dtos/iam/groups/commands/sync-group-permissions.command';
import { IamGroupsRepository } from '@/application/iam/infra/db/postgres/iam-groups.repository';
import { AuthSecretService } from '@/infra/auth/auth-secret.service';

type Input = { groupId: number; data: SyncGroupPermissionsCommand };

@Injectable()
export class SyncGroupPermissionsHandler implements Handler<Input, void> {
    constructor(
        private readonly groupsRepository: IamGroupsRepository,
        private readonly authSecretService: AuthSecretService,
    ) {}

    async execute({ groupId, data }: Input, ctx: RequestContext): Promise<void> {
        const group = await this.groupsRepository.findById(groupId);
        if (!group) throw new NotFoundException('Grupo não encontrado');

        await this.groupsRepository.transaction((trx) =>
            this.groupsRepository.syncPermissions(groupId, data.permissionIds, trx),
        );

        await this.authSecretService.update();
    }
}
