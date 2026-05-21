import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('projects', (t) => {
        t.increments('id').primary();
        t.string('name').notNullable();
        t.string('customer_name').notNullable();
        t.date('date_start').notNullable();
        t.date('date_end').notNullable();
        t.string('hover_photo').nullable();
        t.boolean('favorite').notNullable().defaultTo(false);

        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('projects');
}
