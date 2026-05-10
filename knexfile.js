const dotenv = require('dotenv');

require('ts-node').register({
    transpileOnly: true,
});

dotenv.config();

module.exports = {
    development: {
        client: 'pg',
        connection: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
        },
        pool: {
            min: 2,
            max: 10,
            acquireTimeoutMillis: 5000,
            idleTimeoutMillis: 10000,
        },
        migrations: {
            tableName: 'knex_migrations',
            directory: './src/infra/db/postgres/migrations',
            loadExtensions: ['.ts'],
        },
        // seeds: {
        //     directory: './dist/infra/db/pg/seeds',
        //     loadExtensions: ['.js'],
        // },
    },
};
