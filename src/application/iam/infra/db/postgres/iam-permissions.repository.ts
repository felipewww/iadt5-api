import { PgRepository } from '@/infra/db/postgres/pg-repository';
import { SystemModuleReadModel } from '@/domain/read-models/iam/system-module.read-model';

export class IamPermissionsRepository extends PgRepository {
    tableName = '_permissions';
    protected alias = 'p';

    async findAllGroupedByModule(): Promise<SystemModuleReadModel[]> {
        const rows = await this.readerConnection
            .queryBuilder()
            .table('_system_modules as sm')
            .leftJoin('_permissions as p', 'p.module_id', 'sm.id')
            .select('sm.id as module_id', 'sm.name as module_name', 'sm.description as module_description', 'p.id as permission_id', 'p.action', 'p.name as permission_name')
            .orderBy(['sm.name', 'p.action']);

        return this.groupByModule(rows);
    }

    private groupByModule(rows: any[]): SystemModuleReadModel[] {
        const map = new Map<number, SystemModuleReadModel>();

        for (const row of rows) {
            if (!map.has(row.module_id)) {
                map.set(row.module_id, { id: row.module_id, name: row.module_name, description: row.module_description, permissions: [] });
            }

            if (row.permission_id) {
                map.get(row.module_id).permissions.push({ id: row.permission_id, module_id: row.module_id, action: row.action, name: row.permission_name });
            }
        }

        return Array.from(map.values());
    }
}
