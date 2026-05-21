import { Injectable } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { CreateGroupCommand } from '@/domain/dtos/iam/groups/commands/create-group.command';
import { GroupOutput } from '@/domain/dtos/iam/groups/outputs/group.output';
import { IamGroupsRepository } from '@/application/iam/infra/db/postgres/iam-groups.repository';

@Injectable()
export class CreateGroupHandler implements Handler<CreateGroupCommand, GroupOutput> {
    constructor(private readonly groupsRepository: IamGroupsRepository) {}

    async execute(input: CreateGroupCommand, ctx: RequestContext): Promise<GroupOutput> {
        const group = await this.groupsRepository.transaction((trx) =>
            this.groupsRepository.create({ name: input.name, description: input.description ?? null }, trx),
        );
        return GroupOutput.from(group);
    }
}
