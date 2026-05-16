import { NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { PermissionOutput } from '@/domain/dtos/iam/permissions/outputs/permission.output';
import { IamGroupsRepository } from '@/application/iam/infra/db/postgres/iam-groups.repository';

export class ListGroupPermissionsHandler implements Handler<number, PermissionOutput[]> {
    constructor(private readonly groupsRepository: IamGroupsRepository) {}

    async execute(groupId: number): Promise<PermissionOutput[]> {
        const group = await this.groupsRepository.findById(groupId);
        if (!group) throw new NotFoundException('Grupo não encontrado');

        const permissions = await this.groupsRepository.findPermissions(groupId);
        return permissions.map(PermissionOutput.from);
    }
}
