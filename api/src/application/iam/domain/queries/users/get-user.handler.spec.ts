import { NotFoundException } from '@nestjs/common';
import { GetUserHandler } from './get-user.handler';

jest.mock('@/application/iam/infra/db/postgres/iam-users.repository', () => ({
    IamUsersRepository: jest.fn(),
}));

const mockUser = { id: 1, name: 'Admin', username: 'admin', email: 'a@a.com', active: true, created_at: new Date(), updated_at: new Date() };

describe('GetUserHandler', () => {
    it('lança NotFoundException quando usuário não existe', async () => {
        const handler = new GetUserHandler({ findById: jest.fn().mockResolvedValue(null) } as never);

        await expect(handler.execute(99, {} as never)).rejects.toThrow(NotFoundException);
    });

    it('retorna UserOutput quando usuário existe', async () => {
        const handler = new GetUserHandler({ findById: jest.fn().mockResolvedValue(mockUser) } as never);

        const result = await handler.execute(1, {} as never);

        expect(result.id).toBe(mockUser.id);
        expect(result.username).toBe('admin');
    });
});
