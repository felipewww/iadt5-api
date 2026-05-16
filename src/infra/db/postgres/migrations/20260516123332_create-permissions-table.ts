import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('_permissions', (t) => {
        t.increments('id').primary();
        t.integer('module_id').notNullable().references('id').inTable('_system_modules').onDelete('CASCADE');
        t.smallint('action').notNullable();
        t.string('name').notNullable();
        t.unique(['module_id', 'action']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('_permissions');
}

