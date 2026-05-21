import { NotFoundException } from '@nestjs/common';
import { SyncGroupPermissionsHandler } from './sync-group-permissions.handler';

jest.mock('@/application/iam/infra/db/postgres/iam-groups.repository', () => ({
    IamGroupsRepository: jest.fn(),
}));
jest.mock('@/infra/auth/auth-secret.service', () => ({
    AuthSecretService: jest.fn(),
}));
jest.mock('@/infra/rabbitmq/producer-registry.service', () => ({
    ProducerRegistry: jest.fn(),
}));

const mockGroup = {
    id: 1, name: 'Admins', description: null,
    created_at: new Date(), updated_at: new Date(),
};

function makeHandler(findByIdResult: unknown = mockGroup) {
    const groupsRepo = {
        findById:        jest.fn().mockResolvedValue(findByIdResult),
        transaction:     jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        syncPermissions: jest.fn().mockResolvedValue(undefined),
    };
    const authSecret = { update: jest.fn().mockResolvedValue(undefined) };
    const handler = new SyncGroupPermissionsHandler(groupsRepo as never, authSecret as never);
    return { handler, groupsRepo, authSecret };
}

describe('SyncGroupPermissionsHandler', () => {
    it('lança NotFoundException quando grupo não existe', async () => {
        const { handler } = makeHandler(null);

        await expect(
            handler.execute({ groupId: 99, data: { permissionIds: [1] } }, {} as never),
        ).rejects.toThrow(NotFoundException);
    });

    it('sincroniza as permissões do grupo', async () => {
        const { handler, groupsRepo } = makeHandler();

        await handler.execute({ groupId: 1, data: { permissionIds: [1, 2, 3] } }, {} as never);

        expect(groupsRepo.syncPermissions).toHaveBeenCalledWith(1, [1, 2, 3], expect.anything());
    });

    it('rotaciona o secret de auth após sincronizar', async () => {
        const { handler, authSecret } = makeHandler();

        await handler.execute({ groupId: 1, data: { permissionIds: [] } }, {} as never);

        expect(authSecret.update).toHaveBeenCalledTimes(1);
    });
});
