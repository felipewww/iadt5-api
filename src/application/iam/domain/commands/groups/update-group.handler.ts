import { NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { UpdateGroupCommand } from '@/domain/dtos/iam/groups/commands/update-group.command';
import { GroupOutput } from '@/domain/dtos/iam/groups/outputs/group.output';
import { IamGroupsRepository } from '@/application/iam/infra/db/postgres/iam-groups.repository';

type Input = { id: number; data: UpdateGroupCommand };

export class UpdateGroupHandler implements Handler<Input, GroupOutput> {
    constructor(private readonly groupsRepository: IamGroupsRepository) {}

    async execute({ id, data }: Input): Promise<GroupOutput> {
        const group = await this.groupsRepository.findById(id);
        if (!group) throw new NotFoundException('Grupo não encontrado');

        const updated = await this.groupsRepository.transaction((trx) => this.groupsRepository.update(id, data, trx));
        return GroupOutput.from(updated);
    }
}
