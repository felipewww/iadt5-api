import { Handler } from '@/infra/framework/handler';
import { ListUsersQuery } from '@/domain/dtos/iam/users/queries/list-users.query';
import { UserOutput } from '@/domain/dtos/iam/users/outputs/user.output';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';

export class ListUsersHandler implements Handler<ListUsersQuery, UserOutput[]> {
    constructor(private readonly usersRepository: IamUsersRepository) {}

    async execute(query: ListUsersQuery): Promise<UserOutput[]> {
        const users = await this.usersRepository.getBy(query);
        return users.map(UserOutput.from);
    }
}
