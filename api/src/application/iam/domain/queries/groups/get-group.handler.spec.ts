import { NotFoundException } from '@nestjs/common';
import { GetGroupHandler } from './get-group.handler';

jest.mock('@/application/iam/infra/db/postgres/iam-groups.repository', () => ({
    IamGroupsRepository: jest.fn(),
}));

const mockGroup = { id: 1, name: 'Admins', description: null, created_at: new Date(), updated_at: new Date() };

describe('GetGroupHandler', () => {
    it('lança NotFoundException quando grupo não existe', async () => {
        const handler = new GetGroupHandler({ findById: jest.fn().mockResolvedValue(null) } as never);

        await expect(handler.execute(99, {} as never)).rejects.toThrow(NotFoundException);
    });

    it('retorna GroupOutput quando grupo existe', async () => {
        const handler = new GetGroupHandler({ findById: jest.fn().mockResolvedValue(mockGroup) } as never);

        const result = await handler.execute(1, {} as never);

        expect(result.id).toBe(mockGroup.id);
        expect(result.name).toBe(mockGroup.name);
    });
});
