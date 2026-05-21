import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('projects', (t) => {
        t.integer('cover_document_id').nullable().references('id').inTable('documents').onDelete('SET NULL');
    });
    await knex.schema.alterTable('projects', (t) => {
        t.dropColumn('hover_photo');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('projects', (t) => {
        t.dropColumn('cover_document_id');
        t.text('hover_photo').nullable();
    });
}

