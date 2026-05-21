import { NotFoundException } from '@nestjs/common';
import { ToggleFavoriteHandler } from './toggle-favorite.handler';

jest.mock('@/application/projects/infra/db/postgres/projects.repository', () => ({
    ProjectsRepository: jest.fn(),
}));
jest.mock('@/infra/aws/s3/s3.service', () => ({ S3Service: jest.fn() }));
jest.mock('@/application/projects/infra/s3/projects-bucket', () => ({ projectsBucket: 'test-bucket' }));

const now = new Date();
const mockProject = {
    id: 1, name: 'Projeto X', customer_name: 'Cliente A',
    date_start: now, date_end: now,
    analysis_job_id: null, analysis_status: null,
    favorite: false, thumbnail_key: null, original_key: null,
    created_at: now, updated_at: now,
};

function makeHandler(existing = mockProject, updated = mockProject) {
    const repository = {
        findById:    jest.fn().mockResolvedValue(existing),
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        update:      jest.fn().mockResolvedValue(updated),
    };
    const s3 = { createPresignedGetUrl: jest.fn().mockResolvedValue('https://s3.example.com/photo') };
    return { handler: new ToggleFavoriteHandler(repository as never, s3 as never), repository, s3 };
}

describe('ToggleFavoriteHandler', () => {
    it('lança NotFoundException quando projeto não existe', async () => {
        const { handler } = makeHandler(null as never);

        await expect(handler.execute(99)).rejects.toThrow(NotFoundException);
    });

    it('inverte favorite de false para true', async () => {
        const { handler, repository } = makeHandler(
            { ...mockProject, favorite: false },
            { ...mockProject, favorite: true },
        );

        const result = await handler.execute(1);

        expect(repository.update).toHaveBeenCalledWith(1, { favorite: true }, expect.anything());
        expect(result.favorite).toBe(true);
    });

    it('inverte favorite de true para false', async () => {
        const { handler, repository } = makeHandler(
            { ...mockProject, favorite: true },
            { ...mockProject, favorite: false },
        );

        const result = await handler.execute(1);

        expect(repository.update).toHaveBeenCalledWith(1, { favorite: false }, expect.anything());
        expect(result.favorite).toBe(false);
    });

    it('não chama S3 quando projeto não tem foto', async () => {
        const { handler, s3 } = makeHandler();

        await handler.execute(1);

        expect(s3.createPresignedGetUrl).not.toHaveBeenCalled();
    });
});
