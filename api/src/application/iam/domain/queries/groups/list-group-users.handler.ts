import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { UserOutput } from '@/domain/dtos/iam/users/outputs/user.output';
import { IamGroupsRepository } from '@/application/iam/infra/db/postgres/iam-groups.repository';

@Injectable()
export class ListGroupUsersHandler implements Handler<number, UserOutput[]> {
    constructor(private readonly groupsRepository: IamGroupsRepository) {}

    async execute(groupId: number, ctx: RequestContext): Promise<UserOutput[]> {
        const group = await this.groupsRepository.findById(groupId);
        if (!group) throw new NotFoundException('Grupo não encontrado');

        const users = await this.groupsRepository.findUsers(groupId);
        return users.map(UserOutput.from);
    }
}
