const { Client } = require('pg');
require('dotenv').config();

const DB_NAME = '_1_1';

async function main() {
    const client = new Client({
        host:     process.env.DB_HOST     ?? 'localhost',
        port:     process.env.DB_PORT     ?? 5432,
        user:     process.env.DB_USER,
        password: process.env.DB_PASS,
        database: 'postgres',
    });

    await client.connect();
    try {
        await client.query(`CREATE DATABASE "${DB_NAME}"`);
        console.log(`Database "${DB_NAME}" created.`);
    } catch (err) {
        if (err.code === '42P04') {
            console.log(`Database "${DB_NAME}" already exists.`);
        } else {
            throw err;
        }
    } finally {
        await client.end();
    }
}

main().catch((err) => { console.error(err); process.exit(1); });
