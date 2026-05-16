import { Module, OnModuleInit } from '@nestjs/common';
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
import { GroupPermissionsCache } from '@/infra/cache/group-permissions.cache';

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
    exports: [IamUsersRepository],
})
export class IamModule implements OnModuleInit {
    constructor(
        private readonly groupsRepository: IamGroupsRepository,
        private readonly groupPermissionsCache: GroupPermissionsCache,
    ) {}

    async onModuleInit(): Promise<void> {
        const rows = await this.groupsRepository.findAllGroupPermissions();
        const byGroup = new Map<number, string[]>();

        for (const { group_id, module_id, action } of rows) {
            if (!byGroup.has(group_id)) byGroup.set(group_id, []);
            byGroup.get(group_id).push(`${module_id}:${action}`);
        }

        for (const [groupId, keys] of byGroup) {
            this.groupPermissionsCache.set(groupId, keys);
        }
    }
}
