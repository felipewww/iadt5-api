import { UnauthorizedException } from '@nestjs/common';
import { RefreshHandler } from './refresh.handler';

jest.mock('jose', () => ({
    jwtVerify: jest.fn(),
    SignJWT: jest.fn().mockImplementation(() => ({
        setProtectedHeader: jest.fn().mockReturnThis(),
        setSubject:         jest.fn().mockReturnThis(),
        setIssuedAt:        jest.fn().mockReturnThis(),
        setExpirationTime:  jest.fn().mockReturnThis(),
        sign:               jest.fn().mockResolvedValue('new-access-token'),
    })),
}));

jest.mock('@/application/iam/infra/db/postgres/iam-users.repository', () => ({
    IamUsersRepository: jest.fn(),
}));

jest.mock('@/infra/auth/auth-secret.service', () => ({
    AuthSecretService: jest.fn(),
}));

import { jwtVerify } from 'jose';

const mockUser = {
    id: 1, name: 'Admin', username: 'admin', email: 'admin@example.com',
    password: 'hashed', active: true, root: false,
    created_at: new Date(), updated_at: new Date(),
};

const mockJwtPayload = { type: 'refresh', sub: '1', sessionId: 'session-1' };

function makeHandler() {
    const usersRepository = {
        findById:             jest.fn().mockResolvedValue(mockUser),
        findGroupPermissions: jest.fn().mockResolvedValue([{ module_id: 2, action: 1 }]),
    };
    const authSecretService = {
        buildAccessSecret:  jest.fn().mockReturnValue(new Uint8Array(32)),
        buildRefreshSecret: jest.fn().mockReturnValue(new Uint8Array(32)),
    };
    const handler = new RefreshHandler(usersRepository as never, authSecretService as never);
    return { handler, usersRepository };
}

describe('RefreshHandler', () => {
    beforeEach(() => {
        (jwtVerify as jest.Mock).mockResolvedValue({ payload: mockJwtPayload });
    });

    describe('token inválido ou ausente', () => {
        it('lança UnauthorizedException quando token é vazio', async () => {
            const { handler } = makeHandler();
            await expect(handler.execute('', {} as never)).rejects.toThrow(UnauthorizedException);
        });

        it('lança UnauthorizedException quando jwtVerify falha', async () => {
            const { handler } = makeHandler();
            (jwtVerify as jest.Mock).mockRejectedValue(new Error('invalid signature'));

            await expect(handler.execute('bad-token', {} as never)).rejects.toThrow(UnauthorizedException);
        });

        it('lança UnauthorizedException quando token é do tipo access (não refresh)', async () => {
            const { handler } = makeHandler();
            (jwtVerify as jest.Mock).mockResolvedValue({ payload: { ...mockJwtPayload, type: 'access' } });

            await expect(handler.execute('access-token', {} as never)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('usuário inválido', () => {
        it('lança UnauthorizedException quando usuário não existe', async () => {
            const { handler, usersRepository } = makeHandler();
            usersRepository.findById.mockResolvedValue(null);

            await expect(handler.execute('valid-token', {} as never)).rejects.toThrow(UnauthorizedException);
        });

        it('lança UnauthorizedException quando usuário está inativo', async () => {
            const { handler, usersRepository } = makeHandler();
            usersRepository.findById.mockResolvedValue({ ...mockUser, active: false });

            await expect(handler.execute('valid-token', {} as never)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('permissões', () => {
        it('usuário root recebe acs = ["*"]', async () => {
            const { handler, usersRepository } = makeHandler();
            usersRepository.findById.mockResolvedValue({ ...mockUser, root: true });

            const result = await handler.execute('valid-token', {} as never);

            expect(result.payload.acs).toEqual(['*']);
        });

        it('usuário não-root recebe acs derivado das permissões do grupo', async () => {
            const { handler } = makeHandler();

            const result = await handler.execute('valid-token', {} as never);

            expect(result.payload.acs).toEqual(['2:1']);
        });
    });

    describe('happy path', () => {
        it('retorna novo accessToken e o refreshToken original', async () => {
            const { handler } = makeHandler();

            const result = await handler.execute('original-refresh-token', {} as never);

            expect(result.accessToken).toBe('new-access-token');
            expect(result.refreshToken).toBe('original-refresh-token');
        });

        it('preserva o sessionId do token original no payload', async () => {
            const { handler } = makeHandler();

            const result = await handler.execute('valid-token', {} as never);

            expect(result.payload.sessionId).toBe('session-1');
        });
    });
});
