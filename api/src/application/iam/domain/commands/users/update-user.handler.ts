import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { UpdateUserCommand } from '@/domain/dtos/iam/users/commands/update-user.command';
import { UserOutput } from '@/domain/dtos/iam/users/outputs/user.output';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';

type Input = { id: number; data: UpdateUserCommand };

@Injectable()
export class UpdateUserHandler implements Handler<Input, UserOutput> {
    constructor(private readonly usersRepository: IamUsersRepository) {}

    async execute({ id, data }: Input, ctx: RequestContext): Promise<UserOutput> {
        const user = await this.usersRepository.findById(id);
        if (!user) throw new NotFoundException('Usuário não encontrado');

        if (data.email && data.email !== user.email) {
            const existing = await this.usersRepository.findByEmail(data.email);
            if (existing) throw new ConflictException('E-mail já está em uso');
        }

        // TODO: se data.password existir, hash antes de persistir
        const updated = await this.usersRepository.transaction((trx) => this.usersRepository.update(id, data, trx));

        return UserOutput.from(updated);
    }
}
