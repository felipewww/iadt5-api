import { NotFoundException } from '@nestjs/common';
import { ListGroupPermissionsHandler } from './list-group-permissions.handler';

jest.mock('@/application/iam/infra/db/postgres/iam-groups.repository', () => ({
    IamGroupsRepository: jest.fn(),
}));

const mockGroup = { id: 1, name: 'Admins', description: null, created_at: new Date(), updated_at: new Date() };
const mockPerm  = { id: 1, module_id: 1, action: 1, name: 'Criar usuário' };

function makeRepo(findByIdResult: unknown = mockGroup) {
    return {
        findById:        jest.fn().mockResolvedValue(findByIdResult),
        findPermissions: jest.fn().mockResolvedValue([mockPerm]),
    };
}

describe('ListGroupPermissionsHandler', () => {
    it('lança NotFoundException quando grupo não existe', async () => {
        const handler = new ListGroupPermissionsHandler(makeRepo(null) as never);

        await expect(handler.execute(99, {} as never)).rejects.toThrow(NotFoundException);
    });

    it('retorna as permissões do grupo', async () => {
        const handler = new ListGroupPermissionsHandler(makeRepo() as never);

        const result = await handler.execute(1, {} as never);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(mockPerm.id);
        expect(result[0].name).toBe(mockPerm.name);
    });
});
