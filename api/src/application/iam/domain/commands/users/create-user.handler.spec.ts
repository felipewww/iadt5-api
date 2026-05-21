import { ConflictException } from '@nestjs/common';
import { CreateUserHandler } from './create-user.handler';

jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed-password'), compare: jest.fn() }));
jest.mock('@/application/iam/infra/db/postgres/iam-users.repository', () => ({
    IamUsersRepository: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

const mockUser = {
    id: 1, name: 'Test User', username: 'testuser', email: 'test@example.com',
    password: 'hashed', active: true, root: false,
    created_at: new Date(), updated_at: new Date(),
};

const cmd = { name: 'Test User', username: 'testuser', email: 'test@example.com', password: 'plain' };

function makeRepo(overrides: Record<string, unknown> = {}) {
    return {
        findByUsername: jest.fn().mockResolvedValue(null),
        findByEmail:    jest.fn().mockResolvedValue(null),
        transaction:    jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        create:         jest.fn().mockResolvedValue(mockUser),
        ...overrides,
    };
}

describe('CreateUserHandler', () => {
    it('lança ConflictException quando username já existe', async () => {
        const handler = new CreateUserHandler(makeRepo({ findByUsername: jest.fn().mockResolvedValue(mockUser) }) as never);

        await expect(handler.execute(cmd as never, {} as never)).rejects.toThrow('Username já está em uso');
    });

    it('lança ConflictException quando email já existe', async () => {
        const handler = new CreateUserHandler(makeRepo({ findByEmail: jest.fn().mockResolvedValue(mockUser) }) as never);

        await expect(handler.execute(cmd as never, {} as never)).rejects.toThrow('E-mail já está em uso');
    });

    it('faz hash da senha antes de persistir', async () => {
        const repo = makeRepo();
        const handler = new CreateUserHandler(repo as never);

        await handler.execute(cmd as never, {} as never);

        expect(bcrypt.hash).toHaveBeenCalledWith('plain', 10);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ password: 'hashed-password' }),
            expect.anything(),
        );
    });

    it('cria usuário com active = true e root = false', async () => {
        const repo = makeRepo();
        const handler = new CreateUserHandler(repo as never);

        await handler.execute(cmd as never, {} as never);

        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ active: true, root: false }),
            expect.anything(),
        );
    });

    it('retorna UserOutput com os campos corretos', async () => {
        const handler = new CreateUserHandler(makeRepo() as never);

        const result = await handler.execute(cmd as never, {} as never);

        expect(result.id).toBe(mockUser.id);
        expect(result.username).toBe(mockUser.username);
        expect(result.email).toBe(mockUser.email);
    });
});
