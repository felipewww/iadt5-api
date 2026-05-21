import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('projects', (t) => {
        t.string('analysis_status').nullable().after('analysis_job_id');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('projects', (t) => {
        t.dropColumn('analysis_status');
    });
}
