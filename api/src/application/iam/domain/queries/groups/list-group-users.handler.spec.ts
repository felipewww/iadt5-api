import { NotFoundException } from '@nestjs/common';
import { ListGroupUsersHandler } from './list-group-users.handler';

jest.mock('@/application/iam/infra/db/postgres/iam-groups.repository', () => ({
    IamGroupsRepository: jest.fn(),
}));

const mockGroup = { id: 1, name: 'Admins', description: null, created_at: new Date(), updated_at: new Date() };
const mockUser  = { id: 1, name: 'Admin', username: 'admin', email: 'a@a.com', active: true, created_at: new Date(), updated_at: new Date() };

function makeRepo(findByIdResult: unknown = mockGroup) {
    return {
        findById:  jest.fn().mockResolvedValue(findByIdResult),
        findUsers: jest.fn().mockResolvedValue([mockUser]),
    };
}

describe('ListGroupUsersHandler', () => {
    it('lança NotFoundException quando grupo não existe', async () => {
        const handler = new ListGroupUsersHandler(makeRepo(null) as never);

        await expect(handler.execute(99, {} as never)).rejects.toThrow(NotFoundException);
    });

    it('retorna os usuários do grupo', async () => {
        const handler = new ListGroupUsersHandler(makeRepo() as never);

        const result = await handler.execute(1, {} as never);

        expect(result).toHaveLength(1);
        expect(result[0].username).toBe('admin');
    });
});
