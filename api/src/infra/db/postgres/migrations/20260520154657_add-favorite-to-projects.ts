import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('projects', (t) => {
        // t.boolean('favorite').notNullable().defaultTo(false);

    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('projects', (t) => {
        // t.dropColumn('favorite');
    });
}
