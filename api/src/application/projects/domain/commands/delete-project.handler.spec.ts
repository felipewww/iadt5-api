import { NotFoundException } from '@nestjs/common';
import { DeleteProjectHandler } from './delete-project.handler';

jest.mock('@/application/projects/infra/db/postgres/projects.repository', () => ({
    ProjectsRepository: jest.fn(),
}));

const mockProject = { id: 1, name: 'Projeto X' };

function makeRepo(findByIdResult: unknown = mockProject) {
    return {
        findById:    jest.fn().mockResolvedValue(findByIdResult),
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        delete:      jest.fn().mockResolvedValue(undefined),
    };
}

describe('DeleteProjectHandler', () => {
    it('lança NotFoundException quando projeto não existe', async () => {
        const handler = new DeleteProjectHandler(makeRepo(null) as never);

        await expect(handler.execute(99)).rejects.toThrow(NotFoundException);
    });

    it('deleta o projeto sem retornar valor', async () => {
        const repo = makeRepo();
        const handler = new DeleteProjectHandler(repo as never);

        const result = await handler.execute(1);

        expect(repo.delete).toHaveBeenCalledWith(1, expect.anything());
        expect(result).toBeUndefined();
    });
});
