import { Knex } from "knex";

export abstract class PgRepository {
    abstract tableName: string;
    protected alias: string;

    constructor(
        protected readonly connection: Knex,
        protected readonly readerConnection: Knex
    ) {
    }

    public reader() {
        return this.readerConnection.queryBuilder().table(`${this.tableName} as ${this.getAlias()}`);
    }

    protected writer(trx: Knex.Transaction) {
        const db = trx || this.connection;

        return db.queryBuilder().table(`${this.tableName} as ${this.getAlias()}`);
    }

    public async transaction<T>(callback: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
        return this.connection.transaction(callback);
    }

    public async initTrx() {
        return this.connection.transaction();
    }

    private getAlias() {
        return this.alias ?? this.tableName[0]
    }
}
