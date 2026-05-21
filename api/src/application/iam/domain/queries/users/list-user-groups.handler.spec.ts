import { NotFoundException } from '@nestjs/common';
import { ListUserGroupsHandler } from './list-user-groups.handler';

jest.mock('@/application/iam/infra/db/postgres/iam-users.repository', () => ({
    IamUsersRepository: jest.fn(),
}));

const mockUser  = { id: 1, name: 'Admin', username: 'admin', email: 'a@a.com', active: true, created_at: new Date(), updated_at: new Date() };
const mockGroup = { id: 1, name: 'Admins', description: null, created_at: new Date(), updated_at: new Date() };

function makeRepo(findByIdResult: unknown = mockUser) {
    return {
        findById:   jest.fn().mockResolvedValue(findByIdResult),
        findGroups: jest.fn().mockResolvedValue([mockGroup]),
    };
}

describe('ListUserGroupsHandler', () => {
    it('lança NotFoundException quando usuário não existe', async () => {
        const handler = new ListUserGroupsHandler(makeRepo(null) as never);

        await expect(handler.execute(99, {} as never)).rejects.toThrow(NotFoundException);
    });

    it('retorna os grupos do usuário', async () => {
        const handler = new ListUserGroupsHandler(makeRepo() as never);

        const result = await handler.execute(1, {} as never);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Admins');
    });
});
