import { Knex } from 'knex';
import { PgRepository } from '@/infra/db/postgres/pg-repository';
import { ModelProject } from '@/application/projects/infra/db/postgres/models/model-project';
import { ProjectReadModel } from '@/domain/read-models/projects/project.read-model';
import { ListProjectsQuery } from '@/domain/dtos/projects/queries/list-projects.query';
import { ModelCols } from '@/infra/db/model-cols';
import { applyDateFilters } from '@/infra/db/utils/apply-date-filters';
import { applyPagination } from '@/infra/db/utils/apply-pagination';
import { applyOrdering } from '@/infra/db/utils/apply-ordering';

export class ProjectsRepository extends PgRepository {
    tableName = 'projects';
    protected alias = 'p';

    private readonly cols: ModelCols<ProjectReadModel> = {
        id: 'p.id',
        name: 'p.name',
        customer_name: 'p.customer_name',
        date_start: 'p.date_start',
        date_end: 'p.date_end',
        cover_document_id: 'p.cover_document_id',
        original_key: 'd.original_key',
        thumbnail_key: 'd.thumbnail_key',
        analysis_job_id: 'p.analysis_job_id',
        analysis_status: 'p.analysis_status',
        favorite: 'p.favorite',
        created_at: 'p.created_at',
        updated_at: 'p.updated_at',
    };

    private readonly orderableCols: Record<string, string> = {
        name: 'p.name',
        customer_name: 'p.customer_name',
        date_start: 'p.date_start',
        date_end: 'p.date_end',
        created_at: 'p.created_at',
    };

    async getBy(filters: ListProjectsQuery): Promise<ProjectReadModel[]> {
        const query = this.reader()
            .select(this.cols)
            .leftJoin('documents as d', 'p.cover_document_id', 'd.id');

        if (filters.name) query.whereILike('p.name', `%${filters.name}%`);
        if (filters.customerName) query.whereILike('p.customer_name', `%${filters.customerName}%`);
        if (filters.favorite !== undefined) query.where('p.favorite', filters.favorite);

        applyDateFilters({ dateAfter: filters.dateStartAfter, dateBefore: filters.dateStartBefore }, 'p.date_start', query);
        applyDateFilters({ dateAfter: filters.dateEndAfter, dateBefore: filters.dateEndBefore }, 'p.date_end', query);

        applyOrdering(this.orderableCols, filters, 'p.name', query);
        applyPagination(filters, query);

        return query;
    }

    async findById(id: number): Promise<ProjectReadModel | null> {
        return (await this.reader()
            .select(this.cols)
            .leftJoin('documents as d', 'p.cover_document_id', 'd.id')
            .where('p.id', id)
            .first<ProjectReadModel>()) ?? null;
    }

    async create(data: Omit<ModelProject, 'id' | 'created_at' | 'updated_at'>, trx: Knex.Transaction): Promise<ModelProject> {
        const [row] = await this.writer(trx).insert(data).returning<ModelProject[]>('*');
        return row;
    }

    async update(id: number, data: Partial<Omit<ModelProject, 'id' | 'created_at' | 'updated_at'>>, trx: Knex.Transaction): Promise<ProjectReadModel> {
        await trx.table('projects').where('id', id).update({ ...data, updated_at: new Date() });
        return trx.table('projects as p')
            .select(this.cols)
            .leftJoin('documents as d', 'p.cover_document_id', 'd.id')
            .where('p.id', id)
            .first<ProjectReadModel>();
    }

    async delete(id: number, trx: Knex.Transaction): Promise<void> {
        await this.writer(trx).where('id', id).delete();
    }
}
