import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';

@Injectable()
export class DeleteUserHandler implements Handler<number, void> {
    constructor(private readonly usersRepository: IamUsersRepository) {}

    async execute(id: number, ctx: RequestContext): Promise<void> {
        const user = await this.usersRepository.findById(id);
        if (!user) throw new NotFoundException('Usuário não encontrado');

        await this.usersRepository.transaction((trx) => this.usersRepository.delete(id, trx));
    }
}
