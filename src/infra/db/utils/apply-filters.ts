import { Knex } from 'knex';
import { ModelCols } from '@/infra/db/model-cols';

export type PaginationParams = {
    page?: number;
    pageSize?: number;
}

export function applyFilters<T>(
    filterCols: ModelCols<T>,
    filters: Partial<T>,
    query: Knex.QueryBuilder,
) {
    for (const [key, value] of Object.entries(filters)) {
        if (filterCols[key] && value !== undefined && value !== null) {
            query.where(filterCols[key], value);
        }
    }
}
