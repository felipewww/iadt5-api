import { ListUsersHandler } from './list-users.handler';

jest.mock('@/application/iam/infra/db/postgres/iam-users.repository', () => ({
    IamUsersRepository: jest.fn(),
}));

const mockUser = { id: 1, name: 'Admin', username: 'admin', email: 'a@a.com', active: true, created_at: new Date(), updated_at: new Date() };

describe('ListUsersHandler', () => {
    it('retorna lista de UserOutput', async () => {
        const handler = new ListUsersHandler({ getBy: jest.fn().mockResolvedValue([mockUser]) } as never);

        const result = await handler.execute({} as never, {} as never);

        expect(result).toHaveLength(1);
        expect(result[0].username).toBe('admin');
    });

    it('retorna lista vazia quando não há usuários', async () => {
        const handler = new ListUsersHandler({ getBy: jest.fn().mockResolvedValue([]) } as never);

        const result = await handler.execute({} as never, {} as never);

        expect(result).toEqual([]);
    });
});
