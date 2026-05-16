import { NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { UserOutput } from '@/domain/dtos/iam/users/outputs/user.output';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';

export class GetUserHandler implements Handler<number, UserOutput> {
    constructor(private readonly usersRepository: IamUsersRepository) {}

    async execute(id: number): Promise<UserOutput> {
        const user = await this.usersRepository.findById(id);
        if (!user) throw new NotFoundException('Usuário não encontrado');
        return UserOutput.from(user);
    }
}
