import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { SyncUserGroupsCommand } from '@/domain/dtos/iam/users/commands/sync-user-groups.command';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';
import { AuthSecretService } from '@/infra/auth/auth-secret.service';

type Input = { userId: number; data: SyncUserGroupsCommand };

@Injectable()
export class SyncUserGroupsHandler implements Handler<Input, void> {
    constructor(
        private readonly usersRepository: IamUsersRepository,
        private readonly authSecretService: AuthSecretService,
    ) {}

    async execute({ userId, data }: Input, ctx: RequestContext): Promise<void> {
        const user = await this.usersRepository.findById(userId);
        if (!user) throw new NotFoundException('Usuário não encontrado');

        await this.usersRepository.transaction((trx) => this.usersRepository.syncGroups(userId, data.groupIds, trx));

        await this.authSecretService.update();
    }
}
