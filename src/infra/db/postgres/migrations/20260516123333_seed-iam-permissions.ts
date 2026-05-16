import type { Knex } from 'knex';

// SysModules.iam = 1  |  PermissionsContracts: create=1, read=2, update=3, delete=4
export async function up(knex: Knex): Promise<void> {
    const [module] = await knex('_system_modules')
        .insert({ id: 1, name: 'IAM', description: 'Identity and Access Management' })
        .returning('id');

    await knex('_permissions').insert([
        { module_id: module.id, action: 1, name: 'Criar usuários e grupos' },
        { module_id: module.id, action: 2, name: 'Visualizar usuários e grupos' },
        { module_id: module.id, action: 3, name: 'Atualizar usuários e grupos' },
        { module_id: module.id, action: 4, name: 'Deletar usuários e grupos' },
    ]);
}

export async function down(knex: Knex): Promise<void> {
    await knex('_permissions').where('module_id', 1).delete();
    await knex('_system_modules').where('id', 1).delete();
}

