import { Injectable } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { ListUsersQuery } from '@/domain/dtos/iam/users/queries/list-users.query';
import { UserOutput } from '@/domain/dtos/iam/users/outputs/user.output';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';

@Injectable()
export class ListUsersHandler implements Handler<ListUsersQuery, UserOutput[]> {
    constructor(private readonly usersRepository: IamUsersRepository) {}

    async execute(query: ListUsersQuery, ctx: RequestContext): Promise<UserOutput[]> {
        const users = await this.usersRepository.getBy(query);
        return users.map(UserOutput.from);
    }
}
