import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/infra/framework/permissions/roles.decorator';
import { SysModules } from '@/domain/permissions/sys-modules';
import { PermissionsContracts } from '@/infra/framework/permissions/permissions.contracts';
import { ListPermissionsHandler } from '@/application/iam/domain/queries/permissions/list-permissions.handler';

@ApiTags('IAM — Permissions')
@ApiBearerAuth('access-token')
@Controller('iam/permissions')
export class IamPermissionsController {
    constructor(private readonly listPermissions: ListPermissionsHandler) {}

    @Get()
    @Roles(SysModules.iam, [PermissionsContracts.read])
    findAll() {
        return this.listPermissions.execute();
    }
}
