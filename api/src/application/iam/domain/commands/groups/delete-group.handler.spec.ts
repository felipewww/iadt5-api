import { NotFoundException } from '@nestjs/common';
import { DeleteGroupHandler } from './delete-group.handler';

jest.mock('@/application/iam/infra/db/postgres/iam-groups.repository', () => ({
    IamGroupsRepository: jest.fn(),
}));

const mockGroup = { id: 1, name: 'Admins', description: null, created_at: new Date(), updated_at: new Date() };

function makeRepo(findByIdResult: unknown = mockGroup) {
    return {
        findById:    jest.fn().mockResolvedValue(findByIdResult),
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        delete:      jest.fn().mockResolvedValue(undefined),
    };
}

describe('DeleteGroupHandler', () => {
    it('lança NotFoundException quando grupo não existe', async () => {
        const handler = new DeleteGroupHandler(makeRepo(null) as never);

        await expect(handler.execute(99, {} as never)).rejects.toThrow(NotFoundException);
    });

    it('deleta o grupo sem retornar valor', async () => {
        const repo = makeRepo();
        const handler = new DeleteGroupHandler(repo as never);

        const result = await handler.execute(1, {} as never);

        expect(repo.delete).toHaveBeenCalledWith(1, expect.anything());
        expect(result).toBeUndefined();
    });
});
