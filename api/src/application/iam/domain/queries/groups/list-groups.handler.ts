import { Injectable } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { ListGroupsQuery } from '@/domain/dtos/iam/groups/queries/list-groups.query';
import { GroupOutput } from '@/domain/dtos/iam/groups/outputs/group.output';
import { IamGroupsRepository } from '@/application/iam/infra/db/postgres/iam-groups.repository';

@Injectable()
export class ListGroupsHandler implements Handler<ListGroupsQuery, GroupOutput[]> {
    constructor(private readonly groupsRepository: IamGroupsRepository) {}

    async execute(query: ListGroupsQuery, ctx: RequestContext): Promise<GroupOutput[]> {
        const groups = await this.groupsRepository.getBy(query);
        return groups.map(GroupOutput.from);
    }
}
