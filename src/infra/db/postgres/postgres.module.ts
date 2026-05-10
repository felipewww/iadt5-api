import { Global, Logger, Module } from '@nestjs/common';
import { knex, Knex } from "knex";

@Global()
@Module({
    providers: [
        {
            provide: "PG_CONNECTION",
            useFactory: async (): Promise<Knex> => {
                Logger.log('Initializing PG_CONNECTION');
                const conn = knex({
                    client: "pg",
                    connection: {
                        host: process.env.DB_HOST,
                        port: parseInt(process.env.DB_PORT),
                        user: process.env.DB_USER,
                        password: process.env.DB_PASS,
                        database: process.env.DB_NAME,
                    },
                    acquireConnectionTimeout: 5000,
                    pool: {
                        min: 2,
                        max: 10,
                        acquireTimeoutMillis: 5000,
                        idleTimeoutMillis: 10000,
                    },
                });

                await conn.raw("SELECT 'something'");

                Logger.log('db PG_CONNECTION connected successfully')

                return conn;
            },
        },
    ],
    exports: [
        "PG_CONNECTION",
    ],
})
export class PostgresModule {}
