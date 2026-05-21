import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/infra/framework/permissions/roles.decorator';
import { Context } from '@/infra/framework/context/context.decorator';
import { RequestContext } from '@/infra/framework/context/request-context';
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
import { ListGroupUsersHandler } from '@/application/iam/domain/queries/groups/list-group-users.handler';
import { HashId } from '@/infra/hash-id/hash-id.param.decorator';

@ApiTags('IAM — Groups')
@ApiBearerAuth('access-token')
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
        private readonly listGroupUsers: ListGroupUsersHandler,
    ) {}

    @Post()
    @Roles(SysModules.iam, [PermissionsContracts.create])
    create(@Body() body: CreateGroupCommand, @Context() ctx: RequestContext) {
        return this.createGroup.execute(body, ctx);
    }

    @Put(':id')
    @Roles(SysModules.iam, [PermissionsContracts.update])
    update(@HashId('id') id: number, @Body() body: UpdateGroupCommand, @Context() ctx: RequestContext) {
        return this.updateGroup.execute({ id, data: body }, ctx);
    }

    @Delete(':id')
    @Roles(SysModules.iam, [PermissionsContracts.delete])
    remove(@HashId('id') id: number, @Context() ctx: RequestContext) {
        return this.deleteGroup.execute(id, ctx);
    }

    @Put(':id/permissions')
    @Roles(SysModules.iam, [PermissionsContracts.update])
    syncPermissions(@HashId('id') id: number, @Body() body: SyncGroupPermissionsCommand, @Context() ctx: RequestContext) {
        return this.syncGroupPermissions.execute({ groupId: id, data: body }, ctx);
    }

    @Get()
    @Roles(SysModules.iam, [PermissionsContracts.read])
    findAll(@Query() query: ListGroupsQuery, @Context() ctx: RequestContext) {
        return this.listGroups.execute(query, ctx);
    }

    @Get(':id')
    @Roles(SysModules.iam, [PermissionsContracts.read])
    findOne(@HashId('id') id: number, @Context() ctx: RequestContext) {
        return this.getGroup.execute(id, ctx);
    }

    @Get(':id/permissions')
    @Roles(SysModules.iam, [PermissionsContracts.read])
    findPermissions(@HashId('id') id: number, @Context() ctx: RequestContext) {
        return this.listGroupPermissions.execute(id, ctx);
    }

    @Get(':id/users')
    @Roles(SysModules.iam, [PermissionsContracts.read])
    findUsers(@HashId('id') id: number, @Context() ctx: RequestContext) {
        return this.listGroupUsers.execute(id, ctx);
    }
}
