import { CreateGroupHandler } from './create-group.handler';

jest.mock('@/application/iam/infra/db/postgres/iam-groups.repository', () => ({
    IamGroupsRepository: jest.fn(),
}));

const mockGroup = {
    id: 1, name: 'Admins', description: 'Grupo de administradores',
    created_at: new Date(), updated_at: new Date(),
};

function makeRepo(overrides: Record<string, unknown> = {}) {
    return {
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        create:      jest.fn().mockResolvedValue(mockGroup),
        ...overrides,
    };
}

describe('CreateGroupHandler', () => {
    it('cria grupo e retorna GroupOutput com campos corretos', async () => {
        const handler = new CreateGroupHandler(makeRepo() as never);

        const result = await handler.execute({ name: 'Admins', description: 'desc' }, {} as never);

        expect(result.id).toBe(mockGroup.id);
        expect(result.name).toBe(mockGroup.name);
    });

    it('aceita description como null', async () => {
        const handler = new CreateGroupHandler(
            makeRepo({ create: jest.fn().mockResolvedValue({ ...mockGroup, description: null }) }) as never,
        );

        const result = await handler.execute({ name: 'Sem desc' }, {} as never);

        expect(result.description).toBeNull();
    });
});
