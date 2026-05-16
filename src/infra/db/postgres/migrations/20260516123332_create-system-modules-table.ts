import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('_system_modules', (t) => {
        t.increments('id').primary();
        t.string('name').notNullable().unique();
        t.string('description').nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('_system_modules');
}

