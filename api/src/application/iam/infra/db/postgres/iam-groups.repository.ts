import { Knex } from 'knex';
import { PgRepository } from '@/infra/db/postgres/pg-repository';
import { ModelGroup } from '@/application/iam/infra/db/postgres/models/model-group';
import { GroupReadModel } from '@/domain/read-models/iam/group.read-model';
import { PermissionReadModel } from '@/domain/read-models/iam/system-module.read-model';
import { UserReadModel } from '@/domain/read-models/iam/user.read-model';
import { ListGroupsQuery } from '@/domain/dtos/iam/groups/queries/list-groups.query';
import { ModelCols } from '@/infra/db/model-cols';
import { applyFilters } from '@/infra/db/utils/apply-filters';
import { applyPagination } from '@/infra/db/utils/apply-pagination';

export class IamGroupsRepository extends PgRepository {
    tableName = 'groups';
    protected alias = 'g';

    async getBy(filters: ListGroupsQuery): Promise<GroupReadModel[]> {
        const cols: ModelCols<GroupReadModel> = {
            id: 'g.id',
            name: 'g.name',
            description: 'g.description',
            created_at: 'g.created_at',
            updated_at: 'g.updated_at',
        };

        const query = this.reader().select(cols);

        applyFilters<ListGroupsQuery>(
            {
                name: 'g.name',
                page: null,
                pageSize: null,
            },
            filters,
            query,
        );

        query.orderBy('g.name');
        applyPagination(filters, query);

        return query;
    }

    async findById(id: number): Promise<ModelGroup | null> {
        return (await this.reader().select('g.*').where('g.id', id).first<ModelGroup>()) ?? null;
    }

    async create(data: Omit<ModelGroup, 'id' | 'created_at' | 'updated_at'>, trx: Knex.Transaction): Promise<ModelGroup> {
        const [group] = await this.writer(trx).insert(data).returning<ModelGroup[]>('*');
        return group;
    }

    async update(id: number, data: Partial<ModelGroup>, trx: Knex.Transaction): Promise<ModelGroup> {
        const [group] = await this.writer(trx).where('id', id).update({ ...data, updated_at: new Date() }).returning<ModelGroup[]>('*');
        return group;
    }

    async delete(id: number, trx: Knex.Transaction): Promise<void> {
        await this.writer(trx).where('id', id).delete();
    }

    async findPermissions(groupId: number): Promise<PermissionReadModel[]> {
        return this.readerConnection
            .queryBuilder()
            .table('_permissions as p')
            .join('group_permissions as gp', 'gp.permission_id', 'p.id')
            .where('gp.group_id', groupId)
            .select('p.*');
    }

    async findUsers(groupId: number): Promise<UserReadModel[]> {
        return this.readerConnection
            .queryBuilder()
            .table('users as u')
            .join('user_groups as ug', 'ug.user_id', 'u.id')
            .where('ug.group_id', groupId)
            .select('u.id', 'u.name', 'u.username', 'u.email', 'u.active', 'u.created_at', 'u.updated_at')
            .orderBy('u.name');
    }

    async findAllGroupPermissions(): Promise<{ group_id: number; module_id: number; action: number }[]> {
        return this.readerConnection
            .queryBuilder()
            .table('group_permissions as gp')
            .join('_permissions as p', 'p.id', 'gp.permission_id')
            .select('gp.group_id', 'p.module_id', 'p.action');
    }

    async syncPermissions(groupId: number, permissionIds: number[], trx: Knex.Transaction): Promise<void> {
        await trx('group_permissions').where('group_id', groupId).delete();

        if (permissionIds.length > 0) {
            await trx('group_permissions').insert(
                permissionIds.map((permission_id) => ({ group_id: groupId, permission_id })),
            );
        }
    }
}
