import { Knex } from 'knex';
import { PaginationParams } from '@/infra/db/utils/apply-filters';

export function applyPagination(pagination: PaginationParams | null | undefined, query: Knex.QueryBuilder) {
    if (!pagination?.pageSize) return;

    const page = pagination.page ?? 1;
    const offset = (page - 1) * pagination.pageSize;

    query.limit(pagination.pageSize).offset(offset);
}
