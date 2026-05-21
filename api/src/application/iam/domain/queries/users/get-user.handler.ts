import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { UserOutput } from '@/domain/dtos/iam/users/outputs/user.output';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';

@Injectable()
export class GetUserHandler implements Handler<number, UserOutput> {
    constructor(private readonly usersRepository: IamUsersRepository) {}

    async execute(id: number, ctx: RequestContext): Promise<UserOutput> {
        const user = await this.usersRepository.findById(id);
        if (!user) throw new NotFoundException('Usuário não encontrado');
        return UserOutput.from(user);
    }
}
