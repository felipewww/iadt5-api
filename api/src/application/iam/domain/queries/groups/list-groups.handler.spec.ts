import { ListGroupsHandler } from './list-groups.handler';

jest.mock('@/application/iam/infra/db/postgres/iam-groups.repository', () => ({
    IamGroupsRepository: jest.fn(),
}));

const mockGroup = { id: 1, name: 'Admins', description: null, created_at: new Date(), updated_at: new Date() };

describe('ListGroupsHandler', () => {
    it('retorna lista de GroupOutput', async () => {
        const handler = new ListGroupsHandler({ getBy: jest.fn().mockResolvedValue([mockGroup]) } as never);

        const result = await handler.execute({} as never, {} as never);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Admins');
    });

    it('retorna lista vazia quando não há grupos', async () => {
        const handler = new ListGroupsHandler({ getBy: jest.fn().mockResolvedValue([]) } as never);

        const result = await handler.execute({} as never, {} as never);

        expect(result).toEqual([]);
    });
});
