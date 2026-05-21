import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/infra/framework/permissions/roles.decorator';
import { Context } from '@/infra/framework/context/context.decorator';
import { RequestContext } from '@/infra/framework/context/request-context';
import { SysModules } from '@/domain/permissions/sys-modules';
import { PermissionsContracts } from '@/infra/framework/permissions/permissions.contracts';
import { CreateUserCommand } from '@/domain/dtos/iam/users/commands/create-user.command';
import { UpdateUserCommand } from '@/domain/dtos/iam/users/commands/update-user.command';
import { SyncUserGroupsCommand } from '@/domain/dtos/iam/users/commands/sync-user-groups.command';
import { ListUsersQuery } from '@/domain/dtos/iam/users/queries/list-users.query';
import { CreateUserHandler } from '@/application/iam/domain/commands/users/create-user.handler';
import { UpdateUserHandler } from '@/application/iam/domain/commands/users/update-user.handler';
import { DeleteUserHandler } from '@/application/iam/domain/commands/users/delete-user.handler';
import { SyncUserGroupsHandler } from '@/application/iam/domain/commands/users/sync-user-groups.handler';
import { ListUsersHandler } from '@/application/iam/domain/queries/users/list-users.handler';
import { GetUserHandler } from '@/application/iam/domain/queries/users/get-user.handler';
import { ListUserGroupsHandler } from '@/application/iam/domain/queries/users/list-user-groups.handler';
import { HashId } from '@/infra/hash-id/hash-id.param.decorator';

@ApiTags('IAM — Users')
@ApiBearerAuth('access-token')
@Controller('iam/users')
export class IamUsersController {
    constructor(
        private readonly createUser: CreateUserHandler,
        private readonly updateUser: UpdateUserHandler,
        private readonly deleteUser: DeleteUserHandler,
        private readonly syncUserGroups: SyncUserGroupsHandler,
        private readonly listUsers: ListUsersHandler,
        private readonly getUser: GetUserHandler,
        private readonly listUserGroups: ListUserGroupsHandler,
    ) {}

    @Post()
    @Roles(SysModules.iam, [PermissionsContracts.create])
    create(@Body() body: CreateUserCommand, @Context() ctx: RequestContext) {
        return this.createUser.execute(body, ctx);
    }

    @Put(':id')
    @Roles(SysModules.iam, [PermissionsContracts.update])
    update(@HashId('id') id: number, @Body() body: UpdateUserCommand, @Context() ctx: RequestContext) {
        return this.updateUser.execute({ id, data: body }, ctx);
    }

    @Delete(':id')
    @Roles(SysModules.iam, [PermissionsContracts.delete])
    remove(@HashId('id') id: number, @Context() ctx: RequestContext) {
        return this.deleteUser.execute(id, ctx);
    }

    @Put(':id/groups')
    @Roles(SysModules.iam, [PermissionsContracts.update])
    syncGroups(@HashId('id') id: number, @Body() body: SyncUserGroupsCommand, @Context() ctx: RequestContext) {
        return this.syncUserGroups.execute({ userId: id, data: body }, ctx);
    }

    @Get()
    @Roles(SysModules.iam, [PermissionsContracts.read])
    findAll(@Query() query: ListUsersQuery, @Context() ctx: RequestContext) {
        return this.listUsers.execute(query, ctx);
    }

    @Get(':id')
    @Roles(SysModules.iam, [PermissionsContracts.read])
    findOne(@HashId('id') id: number, @Context() ctx: RequestContext) {
        return this.getUser.execute(id, ctx);
    }

    @Get(':id/groups')
    @Roles(SysModules.iam, [PermissionsContracts.read])
    findGroups(@HashId('id') id: number, @Context() ctx: RequestContext) {
        return this.listUserGroups.execute(id, ctx);
    }
}
