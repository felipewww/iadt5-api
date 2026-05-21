import { Injectable } from '@nestjs/common';
import { PgRepository } from '@/infra/db/postgres/pg-repository';
import { ModelDocument } from '@/infra/documents/models/model-document';
import { Knex } from 'knex';

@Injectable()
export class DocumentsRepository extends PgRepository {
    tableName = 'documents';
    protected alias = 'd';

    async create(
        data: Omit<ModelDocument, 'id' | 'created_at'>,
        trx: Knex.Transaction,
    ): Promise<ModelDocument> {
        const [row] = await this.writer(trx).insert(data).returning<ModelDocument[]>('*');
        return row;
    }
}
