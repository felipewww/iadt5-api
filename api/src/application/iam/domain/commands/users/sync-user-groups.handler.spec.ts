import { NotFoundException } from '@nestjs/common';
import { SyncUserGroupsHandler } from './sync-user-groups.handler';

jest.mock('@/application/iam/infra/db/postgres/iam-users.repository', () => ({
    IamUsersRepository: jest.fn(),
}));
jest.mock('@/infra/auth/auth-secret.service', () => ({
    AuthSecretService: jest.fn(),
}));
jest.mock('@/infra/rabbitmq/producer-registry.service', () => ({
    ProducerRegistry: jest.fn(),
}));

const mockUser = {
    id: 1, name: 'Test', username: 'test', email: 'test@example.com',
    password: 'h', active: true, root: false,
    created_at: new Date(), updated_at: new Date(),
};

function makeHandler(findByIdResult: unknown = mockUser) {
    const usersRepository = {
        findById:    jest.fn().mockResolvedValue(findByIdResult),
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        syncGroups:  jest.fn().mockResolvedValue(undefined),
    };
    const authSecretService = { update: jest.fn().mockResolvedValue(undefined) };
    const handler = new SyncUserGroupsHandler(usersRepository as never, authSecretService as never);
    return { handler, usersRepository, authSecretService };
}

describe('SyncUserGroupsHandler', () => {
    it('lança NotFoundException quando usuário não existe', async () => {
        const { handler } = makeHandler(null);

        await expect(handler.execute({ userId: 99, data: { groupIds: [] } }, {} as never)).rejects.toThrow(NotFoundException);
    });

    it('sincroniza os grupos do usuário', async () => {
        const { handler, usersRepository } = makeHandler();

        await handler.execute({ userId: 1, data: { groupIds: [2, 3] } }, {} as never);

        expect(usersRepository.syncGroups).toHaveBeenCalledWith(1, [2, 3], expect.anything());
    });

    it('rotaciona o secret de auth após sincronizar grupos', async () => {
        const { handler, authSecretService } = makeHandler();

        await handler.execute({ userId: 1, data: { groupIds: [1] } }, {} as never);

        expect(authSecretService.update).toHaveBeenCalledTimes(1);
    });
});
