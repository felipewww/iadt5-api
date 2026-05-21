import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { GroupOutput } from '@/domain/dtos/iam/groups/outputs/group.output';
import { IamGroupsRepository } from '@/application/iam/infra/db/postgres/iam-groups.repository';

@Injectable()
export class GetGroupHandler implements Handler<number, GroupOutput> {
    constructor(private readonly groupsRepository: IamGroupsRepository) {}

    async execute(id: number, ctx: RequestContext): Promise<GroupOutput> {
        const group = await this.groupsRepository.findById(id);
        if (!group) throw new NotFoundException('Grupo não encontrado');
        return GroupOutput.from(group);
    }
}
