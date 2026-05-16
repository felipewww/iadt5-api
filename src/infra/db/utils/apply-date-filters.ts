import { Knex } from 'knex';

export function applyDateFilters(
    filters: { dateAfter?: Date; dateBefore?: Date },
    columnName: string,
    query: Knex.QueryBuilder,
) {
    if (filters.dateAfter && filters.dateBefore) {
        query.whereBetween(columnName, [filters.dateAfter.toISOString(), filters.dateBefore.toISOString()]);
    } else if (filters.dateAfter) {
        query.where(columnName, '>=', filters.dateAfter.toISOString());
    } else if (filters.dateBefore) {
        query.where(columnName, '<=', filters.dateBefore.toISOString());
    }
}
