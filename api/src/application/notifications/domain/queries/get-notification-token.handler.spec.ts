import { GetNotificationTokenHandler } from './get-notification-token.handler';

jest.mock('jose', () => ({
    SignJWT: jest.fn().mockImplementation(() => ({
        setProtectedHeader: jest.fn().mockReturnThis(),
        setExpirationTime:  jest.fn().mockReturnThis(),
        sign:               jest.fn().mockResolvedValue('notification-token'),
    })),
}));

describe('GetNotificationTokenHandler', () => {
    const ctx = { user: { id: 42 } } as never;

    it('retorna um token JWT', async () => {
        const handler = new GetNotificationTokenHandler();

        const result = await handler.execute(ctx);

        expect(result.token).toBe('notification-token');
    });

    it('usa o id do usuário autenticado no payload', async () => {
        const { SignJWT } = await import('jose');
        const handler = new GetNotificationTokenHandler();

        await handler.execute(ctx);

        expect(SignJWT).toHaveBeenCalledWith(
            expect.objectContaining({ sub: '42' }),
        );
    });
});
