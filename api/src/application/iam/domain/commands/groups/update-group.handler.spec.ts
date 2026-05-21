import { NotFoundException } from '@nestjs/common';
import { UpdateGroupHandler } from './update-group.handler';

jest.mock('@/application/iam/infra/db/postgres/iam-groups.repository', () => ({
    IamGroupsRepository: jest.fn(),
}));

const mockGroup = { id: 1, name: 'Admins', description: null, created_at: new Date(), updated_at: new Date() };

function makeRepo(findByIdResult: unknown = mockGroup, updatedGroup = mockGroup) {
    return {
        findById:    jest.fn().mockResolvedValue(findByIdResult),
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        update:      jest.fn().mockResolvedValue(updatedGroup),
    };
}

describe('UpdateGroupHandler', () => {
    it('lança NotFoundException quando grupo não existe', async () => {
        const handler = new UpdateGroupHandler(makeRepo(null) as never);

        await expect(handler.execute({ id: 99, data: { name: 'X' } as never }, {} as never)).rejects.toThrow(NotFoundException);
    });

    it('atualiza e retorna GroupOutput', async () => {
        const updated = { ...mockGroup, name: 'Novo Nome' };
        const repo = makeRepo(mockGroup, updated);
        const handler = new UpdateGroupHandler(repo as never);

        const result = await handler.execute({ id: 1, data: { name: 'Novo Nome' } as never }, {} as never);

        expect(result.name).toBe('Novo Nome');
        expect(repo.update).toHaveBeenCalledWith(1, { name: 'Novo Nome' }, expect.anything());
    });
});
