import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { SyncUserGroupsCommand } from '@/domain/dtos/iam/users/commands/sync-user-groups.command';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';

type Input = { userId: number; data: SyncUserGroupsCommand };

@Injectable()
export class SyncUserGroupsHandler implements Handler<Input, void> {
    constructor(private readonly usersRepository: IamUsersRepository) {}

    async execute({ userId, data }: Input): Promise<void> {
        const user = await this.usersRepository.findById(userId);
        if (!user) throw new NotFoundException('Usuário não encontrado');

        await this.usersRepository.transaction((trx) => this.usersRepository.syncGroups(userId, data.groupIds, trx));
    }
}
