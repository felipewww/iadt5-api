import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('user_groups', (t) => {
        t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        t.integer('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
        t.primary(['user_id', 'group_id']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('user_groups');
}

