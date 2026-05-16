import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@/infra/framework/permissions/roles.decorator';
import { SysModules } from '@/domain/permissions/sys-modules';
import { PermissionsContracts } from '@/infra/framework/permissions/permissions.contracts';
import { CreateGroupCommand } from '@/domain/dtos/iam/groups/commands/create-group.command';
import { UpdateGroupCommand } from '@/domain/dtos/iam/groups/commands/update-group.command';
import { SyncGroupPermissionsCommand } from '@/domain/dtos/iam/groups/commands/sync-group-permissions.command';
import { ListGroupsQuery } from '@/domain/dtos/iam/groups/queries/list-groups.query';
import { CreateGroupHandler } from '@/application/iam/domain/commands/groups/create-group.handler';
import { UpdateGroupHandler } from '@/application/iam/domain/commands/groups/update-group.handler';
import { DeleteGroupHandler } from '@/application/iam/domain/commands/groups/delete-group.handler';
import { SyncGroupPermissionsHandler } from '@/application/iam/domain/commands/groups/sync-group-permissions.handler';
import { ListGroupsHandler } from '@/application/iam/domain/queries/groups/list-groups.handler';
import { GetGroupHandler } from '@/application/iam/domain/queries/groups/get-group.handler';
import { ListGroupPermissionsHandler } from '@/application/iam/domain/queries/groups/list-group-permissions.handler';
import { HashIdPipe } from '@/infra/framework/http/hash-id.pipe';

@ApiTags('IAM — Groups')
@Controller('iam/groups')
export class IamGroupsController {
    constructor(
        private readonly createGroup: CreateGroupHandler,
        private readonly updateGroup: UpdateGroupHandler,
        private readonly deleteGroup: DeleteGroupHandler,
        private readonly syncGroupPermissions: SyncGroupPermissionsHandler,
        private readonly listGroups: ListGroupsHandler,
        private readonly getGroup: GetGroupHandler,
        private readonly listGroupPermissions: ListGroupPermissionsHandler,
    ) {}

    @Post()
    @Roles(SysModules.iam, [PermissionsContracts.create])
    create(@Body() body: CreateGroupCommand) {
        return this.createGroup.execute(body);
    }

    @Put(':id')
    @Roles(SysModules.iam, [PermissionsContracts.update])
    update(@Param('id', HashIdPipe) id: number, @Body() body: UpdateGroupCommand) {
        return this.updateGroup.execute({ id, data: body });
    }

    @Delete(':id')
    @Roles(SysModules.iam, [PermissionsContracts.delete])
    remove(@Param('id', HashIdPipe) id: number) {
        return this.deleteGroup.execute(id);
    }

    @Put(':id/permissions')
    @Roles(SysModules.iam, [PermissionsContracts.update])
    syncPermissions(@Param('id', HashIdPipe) id: number, @Body() body: SyncGroupPermissionsCommand) {
        return this.syncGroupPermissions.execute({ groupId: id, data: body });
    }

    @Get()
    @Roles(SysModules.iam, [PermissionsContracts.read])
    findAll(@Query() query: ListGroupsQuery) {
        return this.listGroups.execute(query);
    }

    @Get(':id')
    @Roles(SysModules.iam, [PermissionsContracts.read])
    findOne(@Param('id', HashIdPipe) id: number) {
        return this.getGroup.execute(id);
    }

    @Get(':id/permissions')
    @Roles(SysModules.iam, [PermissionsContracts.read])
    findPermissions(@Param('id', HashIdPipe) id: number) {
        return this.listGroupPermissions.execute(id);
    }
}
