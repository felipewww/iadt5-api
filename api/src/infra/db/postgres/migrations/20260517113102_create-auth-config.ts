import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('auth_config', (t) => {
        t.increments('id').primary();
        t.string('secret_access').notNullable();
        t.string('secret_refresh').notNullable();
        t.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    await knex('auth_config').insert({
        secret_access: Math.random().toString(36).substring(2),
        secret_refresh: Math.random().toString(36).substring(2),
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('auth_config');
}
