import { Knex } from 'knex';

export type OrderingParams = {
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
}

export function applyOrdering(
    allowedCols: Record<string, string>,
    params: OrderingParams,
    defaultCol: string,
    query: Knex.QueryBuilder,
) {
    const col = (params.orderBy ? allowedCols[params.orderBy] : undefined) ?? defaultCol;
    const dir = params.orderDir ?? 'asc';
    query.orderBy(col, dir);
}
