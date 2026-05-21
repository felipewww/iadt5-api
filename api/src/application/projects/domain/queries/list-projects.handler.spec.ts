import { ListProjectsHandler } from './list-projects.handler';

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

describe('ListProjectsHandler', () => {
    it('retorna lista de ProjectOutput', async () => {
        const handler = new ListProjectsHandler({ getBy: jest.fn().mockResolvedValue([mockProject]) } as never, makeS3() as never);

        const result = await handler.execute({} as never, {} as never);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Projeto X');
    });

    it('retorna lista vazia quando não há projetos', async () => {
        const handler = new ListProjectsHandler({ getBy: jest.fn().mockResolvedValue([]) } as never, makeS3() as never);

        const result = await handler.execute({} as never, {} as never);

        expect(result).toEqual([]);
    });

    it('gera URLs para projetos com thumbnail', async () => {
        const withPhoto = { ...mockProject, thumbnail_key: 'thumb.jpg' };
        const s3 = makeS3();
        const handler = new ListProjectsHandler({ getBy: jest.fn().mockResolvedValue([withPhoto]) } as never, s3 as never);

        const result = await handler.execute({} as never, {} as never);

        expect(s3.createPresignedGetUrl).toHaveBeenCalledWith('thumb.jpg', 'test-bucket');
        expect(result[0].photoUrl).toBe('https://s3.example.com/photo');
    });

    it('não chama S3 para projetos sem foto', async () => {
        const s3 = makeS3();
        const handler = new ListProjectsHandler({ getBy: jest.fn().mockResolvedValue([mockProject]) } as never, s3 as never);

        await handler.execute({} as never, {} as never);

        expect(s3.createPresignedGetUrl).not.toHaveBeenCalled();
    });
});
