import { ListPermissionsHandler } from './list-permissions.handler';

jest.mock('@/domain/permissions/permissions.config', () => ({
    PERMISSIONS_CONFIG: [{ id: 1, name: 'IAM', permissions: [] }],
}));

describe('ListPermissionsHandler', () => {
    it('retorna a configuração de permissões do sistema', () => {
        const handler = new ListPermissionsHandler();

        const result = handler.execute({} as never);

        expect(result).toEqual([{ id: 1, name: 'IAM', permissions: [] }]);
    });
});
