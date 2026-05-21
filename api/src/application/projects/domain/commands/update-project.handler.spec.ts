import { NotFoundException } from '@nestjs/common';
import { UpdateProjectHandler } from './update-project.handler';

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

function makeRepo(findByIdResult: unknown = mockProject, updated = mockProject) {
    return {
        findById:    jest.fn().mockResolvedValue(findByIdResult),
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        update:      jest.fn().mockResolvedValue(updated),
    };
}

function makeS3() {
    return { createPresignedGetUrl: jest.fn().mockResolvedValue('https://s3.example.com/photo') };
}

describe('UpdateProjectHandler', () => {
    it('lança NotFoundException quando projeto não existe', async () => {
        const handler = new UpdateProjectHandler(makeRepo(null) as never, makeS3() as never);

        await expect(handler.execute({ id: 99, name: 'X' } as never, {} as never)).rejects.toThrow(NotFoundException);
    });

    it('não gera URLs S3 quando projeto não tem foto', async () => {
        const s3 = makeS3();
        const handler = new UpdateProjectHandler(makeRepo() as never, s3 as never);

        const result = await handler.execute({ id: 1, name: 'Novo Nome' } as never, {} as never);

        expect(s3.createPresignedGetUrl).not.toHaveBeenCalled();
        expect(result.photoUrl).toBeNull();
    });

    it('gera URL S3 quando projeto tem thumbnail', async () => {
        const withPhoto = { ...mockProject, thumbnail_key: 'thumb.jpg' };
        const s3 = makeS3();
        const handler = new UpdateProjectHandler(makeRepo(withPhoto, withPhoto) as never, s3 as never);

        const result = await handler.execute({ id: 1, name: 'X' } as never, {} as never);

        expect(s3.createPresignedGetUrl).toHaveBeenCalledWith('thumb.jpg', 'test-bucket');
        expect(result.photoUrl).toBe('https://s3.example.com/photo');
    });
});
