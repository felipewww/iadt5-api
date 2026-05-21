import { Knex } from 'knex';
import { PgRepository } from '@/infra/db/postgres/pg-repository';
import { ModelUser } from '@/application/iam/infra/db/postgres/models/model-user';
import { ModelGroup } from '@/application/iam/infra/db/postgres/models/model-group';
import { UserReadModel } from '@/domain/read-models/iam/user.read-model';
import { ListUsersQuery } from '@/domain/dtos/iam/users/queries/list-users.query';
import { ModelCols } from '@/infra/db/model-cols';
import { applyFilters } from '@/infra/db/utils/apply-filters';
import { applyPagination } from '@/infra/db/utils/apply-pagination';

export class IamUsersRepository extends PgRepository {
    tableName = 'users';
    protected alias = 'u';

    async getBy(filters: ListUsersQuery): Promise<UserReadModel[]> {
        const cols: ModelCols<UserReadModel> = {
            id: 'u.id',
            name: 'u.name',
            username: 'u.username',
            email: 'u.email',
            active: 'u.active',
            created_at: 'u.created_at',
            updated_at: 'u.updated_at',
        };

        const query = this.reader().select(cols);

        applyFilters<ListUsersQuery>(
            {
                name: 'u.name',
                username: 'u.username',
                active: 'u.active',
                page: null,
                pageSize: null,
            },
            filters,
            query,
        );

        query.orderBy('u.name');
        applyPagination(filters, query);

        return query;
    }

    private get modelCols(): ModelCols<ModelUser> {
        return {
            id: 'u.id',
            name: 'u.name',
            username: 'u.username',
            email: 'u.email',
            password: 'u.password',
            active: 'u.active',
            root: 'u.root',
            created_at: 'u.created_at',
            updated_at: 'u.updated_at',
        };
    }

    async findById(id: number): Promise<ModelUser | null> {
        return (await this.reader().select(this.modelCols).where('u.id', id).first<ModelUser>()) ?? null;
    }

    async findByUsername(username: string): Promise<ModelUser | null> {
        return (await this.reader().select(this.modelCols).where('u.username', username).first<ModelUser>()) ?? null;
    }

    async findByEmail(email: string): Promise<ModelUser | null> {
        return (await this.reader().select(this.modelCols).where('u.email', email).first<ModelUser>()) ?? null;
    }

    async create(data: Omit<ModelUser, 'id' | 'created_at' | 'updated_at'>, trx: Knex.Transaction): Promise<ModelUser> {
        const [user] = await this.writer(trx).insert(data).returning<ModelUser[]>('*');
        return user;
    }

    async update(id: number, data: Partial<ModelUser>, trx: Knex.Transaction): Promise<ModelUser> {
        const [user] = await this.writer(trx).where('id', id).update({ ...data, updated_at: new Date() }).returning<ModelUser[]>('*');
        return user;
    }

    async delete(id: number, trx: Knex.Transaction): Promise<void> {
        await this.writer(trx).where('id', id).delete();
    }

    async findGroups(userId: number): Promise<ModelGroup[]> {
        return this.readerConnection
            .queryBuilder()
            .table('groups as g')
            .join('user_groups as ug', 'ug.group_id', 'g.id')
            .where('ug.user_id', userId)
            .select('g.*')
            .orderBy('g.name');
    }

    async syncGroups(userId: number, groupIds: number[], trx: Knex.Transaction): Promise<void> {
        await trx('user_groups').where('user_id', userId).delete();

        if (groupIds.length > 0) {
            await trx('user_groups').insert(groupIds.map((group_id) => ({ user_id: userId, group_id })));
        }
    }

    async findGroupPermissions(userId: number): Promise<{ module_id: number; action: number }[]> {
        return this.readerConnection
            .queryBuilder()
            .table('user_groups as ug')
            .join('group_permissions as gp', 'gp.group_id', 'ug.group_id')
            .join('_permissions as p', 'p.id', 'gp.permission_id')
            .where('ug.user_id', userId)
            .distinct('p.module_id', 'p.action')
            .select('p.module_id', 'p.action');
    }
}
