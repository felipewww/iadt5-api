import { Handler } from '@/infra/framework/handler';
import { SystemModuleOutput } from '@/domain/dtos/iam/permissions/outputs/system-module.output';
import { IamPermissionsRepository } from '@/application/iam/infra/db/postgres/iam-permissions.repository';

export class ListPermissionsHandler implements Handler<void, SystemModuleOutput[]> {
    constructor(private readonly permissionsRepository: IamPermissionsRepository) {}

    async execute(): Promise<SystemModuleOutput[]> {
        const modules = await this.permissionsRepository.findAllGroupedByModule();
        return modules.map(SystemModuleOutput.from);
    }
}
