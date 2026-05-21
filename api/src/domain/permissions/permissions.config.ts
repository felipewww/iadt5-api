// Fonte de verdade das permissões do sistema.
// Para adicionar uma nova permissão: crie uma migration com IDs explícitos e espelhe aqui.
// Os IDs devem ser pré-definidos e nunca reutilizados — o banco os usa apenas para FK em group_permissions.

export const PERMISSIONS_CONFIG = [
    {
        id: 1,
        name: 'IAM',
        description: 'Identity and Access Management',
        permissions: [
            { id: 1, module_id: 1, action: 1, name: 'Criar usuários e grupos' },
            { id: 2, module_id: 1, action: 2, name: 'Visualizar usuários e grupos' },
            { id: 3, module_id: 1, action: 3, name: 'Atualizar usuários e grupos' },
            { id: 4, module_id: 1, action: 4, name: 'Deletar usuários e grupos' },
        ],
    },
    {
        id: 2,
        name: 'Projects',
        description: 'Gerenciamento de projetos',
        permissions: [
            { id: 5, module_id: 2, action: 1, name: 'Criar projetos' },
            { id: 6, module_id: 2, action: 2, name: 'Visualizar projetos' },
            { id: 7, module_id: 2, action: 3, name: 'Atualizar projetos' },
            { id: 8, module_id: 2, action: 4, name: 'Deletar projetos' },
        ],
    },
]
