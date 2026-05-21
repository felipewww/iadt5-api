import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('group_permissions', (t) => {
        t.integer('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
        t.integer('permission_id').notNullable().references('id').inTable('_permissions').onDelete('CASCADE');
        t.primary(['group_id', 'permission_id']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('group_permissions');
}

