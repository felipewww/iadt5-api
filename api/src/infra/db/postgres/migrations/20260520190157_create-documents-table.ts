import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('documents', (t) => {
        t.increments('id').primary();
        t.text('original_key').notNullable();
        t.text('thumbnail_key').nullable();
        t.string('mime_type', 100).notNullable();
        t.string('extension', 20).notNullable();
        t.integer('size_bytes').notNullable();
        t.timestamp('created_at').defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('documents');
}

