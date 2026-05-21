import { NotFoundException } from '@nestjs/common';
import { UploadProjectCoverHandler } from './upload-project-cover.handler';
import { MulterFile } from '@/infra/aws/s3/multer-file.type';

jest.mock('@/application/projects/infra/db/postgres/projects.repository', () => ({
    ProjectsRepository: jest.fn(),
}));
jest.mock('@/infra/aws/s3/s3.service', () => ({ S3Service: jest.fn() }));
jest.mock('@/infra/documents/documents.service', () => ({ DocumentsService: jest.fn() }));
jest.mock('@/application/projects/infra/s3/projects-bucket', () => ({ projectsBucket: 'test-bucket' }));

const now = new Date();
const mockProject = {
    id: 1, name: 'Projeto X', customer_name: 'Cliente A',
    date_start: now, date_end: now,
    analysis_job_id: null, analysis_status: null,
    favorite: false, thumbnail_key: null, original_key: null,
    created_at: now, updated_at: now,
};
const mockDoc = { id: 10, original_key: 'projects/1/orig.png', thumbnail_key: null };

function makeFile(): MulterFile {
    return { buffer: Buffer.from('img'), originalname: 'capa.png', mimetype: 'image/png', size: 100 };
}

function makeHandler(overrides: Record<string, unknown> = {}) {
    const repository = {
        findById:    jest.fn().mockResolvedValue(mockProject),
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        update:      jest.fn().mockResolvedValue(mockProject),
    };
    const s3 = {
        createPresignedGetUrl: jest.fn().mockResolvedValue('https://s3.example.com/photo'),
    };
    const documents = {
        upload: jest.fn().mockResolvedValue(mockDoc),
    };
    const deps = { repository, s3, documents, ...overrides };
    const handler = new UploadProjectCoverHandler(deps.repository as never, deps.s3 as never, deps.documents as never);
    return { handler, ...deps };
}

describe('UploadProjectCoverHandler', () => {
    it('lança NotFoundException quando projeto não existe', async () => {
        const { handler, repository } = makeHandler();
        repository.findById.mockResolvedValue(null);

        await expect(handler.execute(99, makeFile())).rejects.toThrow(NotFoundException);
    });

    it('faz upload do documento com thumbnail', async () => {
        const { handler, documents } = makeHandler();

        await handler.execute(1, makeFile());

        expect(documents.upload).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ thumbnail: { width: 400, height: 300 } }),
        );
    });

    it('atualiza o projeto com o id do documento de capa', async () => {
        const { handler, repository } = makeHandler();

        await handler.execute(1, makeFile());

        expect(repository.update).toHaveBeenCalledWith(1, { cover_document_id: mockDoc.id }, expect.anything());
    });

    it('retorna ProjectOutput sem URL quando projeto não tem thumbnail após upload', async () => {
        const { handler } = makeHandler();

        const result = await handler.execute(1, makeFile());

        expect(result.photoUrl).toBeNull();
    });

    it('retorna URL assinada quando projeto tem thumbnail após upload', async () => {
        const projectWithThumb = { ...mockProject, thumbnail_key: 'projects/1/thumb.webp' };
        const { handler, repository, s3 } = makeHandler();
        repository.update.mockResolvedValue(projectWithThumb);

        const result = await handler.execute(1, makeFile());

        expect(s3.createPresignedGetUrl).toHaveBeenCalledWith('projects/1/thumb.webp', 'test-bucket');
        expect(result.photoUrl).toBe('https://s3.example.com/photo');
    });
});
