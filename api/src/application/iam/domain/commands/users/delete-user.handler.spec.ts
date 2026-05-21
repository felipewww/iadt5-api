import { NotFoundException } from '@nestjs/common';
import { DeleteUserHandler } from './delete-user.handler';

jest.mock('@/application/iam/infra/db/postgres/iam-users.repository', () => ({
    IamUsersRepository: jest.fn(),
}));

const mockUser = {
    id: 1, name: 'Test User', username: 'testuser', email: 'test@example.com',
    password: 'hashed', active: true, root: false,
    created_at: new Date(), updated_at: new Date(),
};

function makeRepo(overrides: Record<string, unknown> = {}) {
    return {
        findById:    jest.fn().mockResolvedValue(mockUser),
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        delete:      jest.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

describe('DeleteUserHandler', () => {
    it('lança NotFoundException quando usuário não existe', async () => {
        const handler = new DeleteUserHandler(makeRepo({ findById: jest.fn().mockResolvedValue(null) }) as never);

        await expect(handler.execute(99, {} as never)).rejects.toThrow(NotFoundException);
    });

    it('deleta o usuário sem retornar valor', async () => {
        const repo = makeRepo();
        const handler = new DeleteUserHandler(repo as never);

        const result = await handler.execute(1, {} as never);

        expect(repo.delete).toHaveBeenCalledWith(1, expect.anything());
        expect(result).toBeUndefined();
    });
});
