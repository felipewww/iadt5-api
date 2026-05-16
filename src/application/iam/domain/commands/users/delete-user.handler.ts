import { NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';

export class DeleteUserHandler implements Handler<number, void> {
    constructor(private readonly usersRepository: IamUsersRepository) {}

    async execute(id: number): Promise<void> {
        const user = await this.usersRepository.findById(id);
        if (!user) throw new NotFoundException('Usuário não encontrado');

        await this.usersRepository.transaction((trx) => this.usersRepository.delete(id, trx));
    }
}
