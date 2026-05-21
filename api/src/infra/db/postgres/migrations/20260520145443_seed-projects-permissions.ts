import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex('_system_modules').insert({ id: 2, name: 'Projects', description: 'Gerenciamento de projetos' });
    await knex('_permissions').insert([
        { id: 5, module_id: 2, action: 1, name: 'Criar projetos' },
        { id: 6, module_id: 2, action: 2, name: 'Visualizar projetos' },
        { id: 7, module_id: 2, action: 3, name: 'Atualizar projetos' },
        { id: 8, module_id: 2, action: 4, name: 'Deletar projetos' },
    ]);
}

export async function down(knex: Knex): Promise<void> {
    await knex('_permissions').whereIn('id', [5, 6, 7, 8]).delete();
    await knex('_system_modules').where('id', 2).delete();
}
