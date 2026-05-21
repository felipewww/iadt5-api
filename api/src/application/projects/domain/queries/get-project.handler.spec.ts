import { NotFoundException } from '@nestjs/common';
import { GetProjectHandler } from './get-project.handler';

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

function makeS3() {
    return { createPresignedGetUrl: jest.fn().mockResolvedValue('https://s3.example.com/photo') };
}

describe('GetProjectHandler', () => {
    it('lança NotFoundException quando projeto não existe', async () => {
        const handler = new GetProjectHandler({ findById: jest.fn().mockResolvedValue(null) } as never, makeS3() as never);

        await expect(handler.execute(99)).rejects.toThrow(NotFoundException);
    });

    it('retorna ProjectOutput sem URL quando não tem thumbnail', async () => {
        const s3 = makeS3();
        const handler = new GetProjectHandler({ findById: jest.fn().mockResolvedValue(mockProject) } as never, s3 as never);

        const result = await handler.execute(1);

        expect(s3.createPresignedGetUrl).not.toHaveBeenCalled();
        expect(result.photoUrl).toBeNull();
    });

    it('gera URL S3 quando projeto tem thumbnail', async () => {
        const withPhoto = { ...mockProject, thumbnail_key: 'thumb.jpg' };
        const s3 = makeS3();
        const handler = new GetProjectHandler({ findById: jest.fn().mockResolvedValue(withPhoto) } as never, s3 as never);

        const result = await handler.execute(1);

        expect(s3.createPresignedGetUrl).toHaveBeenCalledWith('thumb.jpg', 'test-bucket');
        expect(result.photoUrl).toBe('https://s3.example.com/photo');
    });
});
