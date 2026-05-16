import { Module } from '@nestjs/common';
import { IamUsersController } from '@/application/iam/controllers/iam-users.controller';
import { IamGroupsController } from '@/application/iam/controllers/iam-groups.controller';
import { IamPermissionsController } from '@/application/iam/controllers/iam-permissions.controller';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';
import { IamGroupsRepository } from '@/application/iam/infra/db/postgres/iam-groups.repository';
import { IamPermissionsRepository } from '@/application/iam/infra/db/postgres/iam-permissions.repository';
// commands
import { CreateUserHandler } from '@/application/iam/domain/commands/users/create-user.handler';
import { UpdateUserHandler } from '@/application/iam/domain/commands/users/update-user.handler';
import { DeleteUserHandler } from '@/application/iam/domain/commands/users/delete-user.handler';
import { SyncUserGroupsHandler } from '@/application/iam/domain/commands/users/sync-user-groups.handler';
import { CreateGroupHandler } from '@/application/iam/domain/commands/groups/create-group.handler';
import { UpdateGroupHandler } from '@/application/iam/domain/commands/groups/update-group.handler';
import { DeleteGroupHandler } from '@/application/iam/domain/commands/groups/delete-group.handler';
import { SyncGroupPermissionsHandler } from '@/application/iam/domain/commands/groups/sync-group-permissions.handler';
// queries
import { ListUsersHandler } from '@/application/iam/domain/queries/users/list-users.handler';
import { GetUserHandler } from '@/application/iam/domain/queries/users/get-user.handler';
import { ListUserGroupsHandler } from '@/application/iam/domain/queries/users/list-user-groups.handler';
import { ListGroupsHandler } from '@/application/iam/domain/queries/groups/list-groups.handler';
import { GetGroupHandler } from '@/application/iam/domain/queries/groups/get-group.handler';
import { ListGroupPermissionsHandler } from '@/application/iam/domain/queries/groups/list-group-permissions.handler';
import { ListPermissionsHandler } from '@/application/iam/domain/queries/permissions/list-permissions.handler';

@Module({
    controllers: [IamUsersController, IamGroupsController, IamPermissionsController],
    providers: [
        IamUsersRepository,
        IamGroupsRepository,
        IamPermissionsRepository,
        // commands
        CreateUserHandler,
        UpdateUserHandler,
        DeleteUserHandler,
        SyncUserGroupsHandler,
        CreateGroupHandler,
        UpdateGroupHandler,
        DeleteGroupHandler,
        SyncGroupPermissionsHandler,
        // queries
        ListUsersHandler,
        GetUserHandler,
        ListUserGroupsHandler,
        ListGroupsHandler,
        GetGroupHandler,
        ListGroupPermissionsHandler,
        ListPermissionsHandler,
    ],
})
export class IamModule {}
