import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { GroupOutput } from '@/domain/dtos/iam/groups/outputs/group.output';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';

@Injectable()
export class ListUserGroupsHandler implements Handler<number, GroupOutput[]> {
    constructor(private readonly usersRepository: IamUsersRepository) {}

    async execute(userId: number): Promise<GroupOutput[]> {
        const user = await this.usersRepository.findById(userId);
        if (!user) throw new NotFoundException('Usuário não encontrado');

        const groups = await this.usersRepository.findGroups(userId);
        return groups.map(GroupOutput.from);
    }
}
