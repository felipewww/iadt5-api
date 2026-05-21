import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('projects', (t) => {
        t.integer('analysis_document_id').nullable().references('id').inTable('documents').onDelete('SET NULL');
        t.text('analysis_job_id').nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('projects', (t) => {
        t.dropColumn('analysis_document_id');
        t.dropColumn('analysis_job_id');
    });
}

