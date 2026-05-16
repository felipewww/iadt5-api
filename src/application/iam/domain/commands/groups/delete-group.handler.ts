import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { IamGroupsRepository } from '@/application/iam/infra/db/postgres/iam-groups.repository';

@Injectable()
export class DeleteGroupHandler implements Handler<number, void> {
    constructor(private readonly groupsRepository: IamGroupsRepository) {}

    async execute(id: number): Promise<void> {
        const group = await this.groupsRepository.findById(id);
        if (!group) throw new NotFoundException('Grupo não encontrado');

        await this.groupsRepository.transaction((trx) => this.groupsRepository.delete(id, trx));
    }
}
