import { UnauthorizedException } from '@nestjs/common';
import { LoginHandler } from './login.handler';
import { LoginCommand } from '@/domain/dtos/auth/commands/login.command';

jest.mock('jose', () => ({
    SignJWT: jest.fn().mockImplementation(() => ({
        setProtectedHeader: jest.fn().mockReturnThis(),
        setSubject:         jest.fn().mockReturnThis(),
        setIssuedAt:        jest.fn().mockReturnThis(),
        setExpirationTime:  jest.fn().mockReturnThis(),
        sign:               jest.fn().mockResolvedValue('signed-token'),
    })),
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
}));

jest.mock('@/application/iam/infra/db/postgres/iam-users.repository', () => ({
    IamUsersRepository: jest.fn(),
}));

jest.mock('@/infra/auth/auth-secret.service', () => ({
    AuthSecretService: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

const mockUser = {
    id: 1,
    name: 'Admin',
    username: 'admin',
    email: 'admin@example.com',
    password: '$2a$10$hashedpassword',
    active: true,
    root: false,
    created_at: new Date(),
    updated_at: new Date(),
};

const mockPermissions = [
    { module_id: 1, action: 1 },
    { module_id: 1, action: 2 },
];

function makeHandler(overrides: Record<string, unknown> = {}) {
    const usersRepository = {
        findByUsername:      jest.fn().mockResolvedValue(mockUser),
        findGroupPermissions: jest.fn().mockResolvedValue(mockPermissions),
    };
    const authSecretService = {
        buildAccessSecret:  jest.fn().mockReturnValue(new Uint8Array(32)),
        buildRefreshSecret: jest.fn().mockReturnValue(new Uint8Array(32)),
    };

    const deps = { usersRepository, authSecretService, ...overrides };

    const handler = new LoginHandler(deps.usersRepository as never, deps.authSecretService as never);

    return { handler, ...deps };
}

const validCommand: LoginCommand = { username: 'admin', password: 'secret' };

describe('LoginHandler', () => {
    beforeEach(() => {
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });

    describe('usuário não encontrado', () => {
        it('lança UnauthorizedException quando o username não existe', async () => {
            const { handler, usersRepository } = makeHandler();
            usersRepository.findByUsername.mockResolvedValue(null);

            await expect(handler.execute(validCommand, {} as never)).rejects.toThrow(UnauthorizedException);
        });

        it('a mensagem não revela se o username existe (credenciais inválidas)', async () => {
            const { handler, usersRepository } = makeHandler();
            usersRepository.findByUsername.mockResolvedValue(null);

            await expect(handler.execute(validCommand, {} as never)).rejects.toThrow('Credenciais inválidas');
        });
    });

    describe('senha incorreta', () => {
        it('lança UnauthorizedException quando a senha não bate', async () => {
            const { handler } = makeHandler();
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(handler.execute(validCommand, {} as never)).rejects.toThrow(UnauthorizedException);
        });

        it('a mensagem é a mesma do username inválido (não vaza informação)', async () => {
            const { handler } = makeHandler();
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(handler.execute(validCommand, {} as never)).rejects.toThrow('Credenciais inválidas');
        });
    });

    describe('usuário inativo', () => {
        it('lança UnauthorizedException quando o usuário está inativo', async () => {
            const { handler, usersRepository } = makeHandler();
            usersRepository.findByUsername.mockResolvedValue({ ...mockUser, active: false });

            await expect(handler.execute(validCommand, {} as never)).rejects.toThrow('Usuário inativo');
        });
    });

    describe('permissões', () => {
        it('usuário root recebe acs = ["*"]', async () => {
            const { handler, usersRepository } = makeHandler();
            usersRepository.findByUsername.mockResolvedValue({ ...mockUser, root: true });

            const result = await handler.execute(validCommand, {} as never);

            expect(result.payload.acs).toEqual(['*']);
        });

        it('usuário não-root recebe acs derivado das permissões do grupo', async () => {
            const { handler } = makeHandler();

            const result = await handler.execute(validCommand, {} as never);

            expect(result.payload.acs).toEqual(['1:1', '1:2']);
        });

        it('usuário não-root sem grupos recebe acs vazio', async () => {
            const { handler, usersRepository } = makeHandler();
            usersRepository.findGroupPermissions.mockResolvedValue([]);

            const result = await handler.execute(validCommand, {} as never);

            expect(result.payload.acs).toEqual([]);
        });
    });

    describe('happy path', () => {
        it('retorna accessToken e refreshToken', async () => {
            const { handler } = makeHandler();

            const result = await handler.execute(validCommand, {} as never);

            expect(result.accessToken).toBe('signed-token');
            expect(result.refreshToken).toBe('signed-token');
        });

        it('retorna payload com username e name do usuário', async () => {
            const { handler } = makeHandler();

            const result = await handler.execute(validCommand, {} as never);

            expect(result.payload.username).toBe('admin');
            expect(result.payload.name).toBe('Admin');
        });

        it('accessTokenExp é um timestamp futuro', async () => {
            const { handler } = makeHandler();
            const before = Math.floor(Date.now() / 1000);

            const result = await handler.execute(validCommand, {} as never);

            expect(result.accessTokenExp).toBeGreaterThan(before);
        });
    });
});
