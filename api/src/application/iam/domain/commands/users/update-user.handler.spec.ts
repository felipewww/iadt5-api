import { ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateUserHandler } from './update-user.handler';

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
        findByEmail: jest.fn().mockResolvedValue(null),
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        update:      jest.fn().mockResolvedValue(mockUser),
        ...overrides,
    };
}

describe('UpdateUserHandler', () => {
    it('lança NotFoundException quando usuário não existe', async () => {
        const handler = new UpdateUserHandler(makeRepo({ findById: jest.fn().mockResolvedValue(null) }) as never);

        await expect(handler.execute({ id: 99, data: {} as never }, {} as never)).rejects.toThrow(NotFoundException);
    });

    it('lança ConflictException quando novo email já está em uso por outro usuário', async () => {
        const handler = new UpdateUserHandler(
            makeRepo({ findByEmail: jest.fn().mockResolvedValue({ ...mockUser, id: 99 }) }) as never,
        );

        await expect(
            handler.execute({ id: 1, data: { email: 'outro@example.com' } as never }, {} as never),
        ).rejects.toThrow('E-mail já está em uso');
    });

    it('não verifica duplicata quando email não mudou', async () => {
        const repo = makeRepo({ findByEmail: jest.fn() });
        const handler = new UpdateUserHandler(repo as never);

        await handler.execute({ id: 1, data: { email: mockUser.email } as never }, {} as never);

        expect(repo.findByEmail).not.toHaveBeenCalled();
    });

    it('retorna UserOutput atualizado', async () => {
        const updated = { ...mockUser, name: 'Novo Nome' };
        const handler = new UpdateUserHandler(makeRepo({ update: jest.fn().mockResolvedValue(updated) }) as never);

        const result = await handler.execute({ id: 1, data: { name: 'Novo Nome' } as never }, {} as never);

        expect(result.name).toBe('Novo Nome');
    });
});
