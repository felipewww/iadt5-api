import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { UploadProjectAnalysisHandler } from './upload-project-analysis.handler';
import { MulterFile } from '@/infra/aws/s3/multer-file.type';

// Prevent Jest from loading the actual implementations (which pull in ESM-only packages like jose)
jest.mock('@/infra/jobs/jobs.service', () => ({ JobsService: jest.fn() }));
jest.mock('@/infra/documents/documents.service', () => ({ DocumentsService: jest.fn() }));
jest.mock('@/infra/aws/s3/s3.service', () => ({ S3Service: jest.fn() }));
jest.mock('@/infra/rabbitmq/producer-registry.service', () => ({ ProducerRegistry: jest.fn() }));
jest.mock('@/application/projects/infra/db/postgres/projects.repository', () => ({ ProjectsRepository: jest.fn() }));

const MB = 1024 * 1024;

function makeFile(overrides: Partial<MulterFile> = {}): MulterFile {
    return {
        buffer: Buffer.from('data'),
        originalname: 'diagram.pdf',
        mimetype: 'application/pdf',
        size: 1 * MB,
        ...overrides,
    };
}

const mockProject = { id: 1, name: 'Projeto teste' };
const mockDoc     = { id: 10, original_key: 'projects/1/analysis/job-1.pdf' };
const mockJob     = { jobId: 'job-1', streamToken: 'token-abc' };

function makeHandler(overrides: Record<string, unknown> = {}) {
    const repository = {
        findById:    jest.fn().mockResolvedValue(mockProject),
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        update:      jest.fn().mockResolvedValue(mockProject),
    };
    const documents = {
        upload: jest.fn().mockResolvedValue(mockDoc),
    };
    const jobs = {
        create:  jest.fn().mockResolvedValue(mockJob),
        addStep: jest.fn().mockResolvedValue(undefined),
    };
    const s3 = {
        createPresignedGetUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
    };
    const producerRegistry = {
        get: jest.fn().mockReturnValue({ publish: jest.fn() }),
    };

    const deps = { repository, documents, jobs, s3, producerRegistry, ...overrides };

    const handler = new UploadProjectAnalysisHandler(
        deps.repository as never,
        deps.documents as never,
        deps.jobs as never,
        deps.s3 as never,
        deps.producerRegistry as never,
    );

    return { handler, ...deps };
}

describe('UploadProjectAnalysisHandler', () => {
    describe('guardrail — projeto inexistente', () => {
        it('lança NotFoundException quando o projeto não existe', async () => {
            const { handler, repository } = makeHandler();
            repository.findById.mockResolvedValue(null);

            await expect(handler.execute(99, makeFile())).rejects.toThrow(NotFoundException);
        });
    });

    describe('guardrail — tipo de arquivo', () => {
        it.each([
            'text/plain',
            'application/json',
            'image/bmp',
            'application/zip',
        ])('rejeita mimetype "%s" com BadRequestException', async (mimetype) => {
            const { handler } = makeHandler();

            await expect(handler.execute(1, makeFile({ mimetype }))).rejects.toThrow(BadRequestException);
        });

        it.each([
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/gif',
            'image/webp',
        ])('aceita mimetype "%s"', async (mimetype) => {
            const { handler } = makeHandler();

            await expect(handler.execute(1, makeFile({ mimetype }))).resolves.not.toThrow();
        });
    });

    describe('guardrail — tamanho do arquivo', () => {
        it('rejeita arquivo acima de 5 MB com BadRequestException', async () => {
            const { handler } = makeHandler();

            await expect(handler.execute(1, makeFile({ size: 5 * MB + 1 }))).rejects.toThrow(BadRequestException);
        });

        it('aceita arquivo exatamente no limite de 5 MB', async () => {
            const { handler } = makeHandler();

            await expect(handler.execute(1, makeFile({ size: 5 * MB }))).resolves.not.toThrow();
        });

        it('a mensagem de erro inclui o tamanho em MB', async () => {
            const { handler } = makeHandler();

            await expect(handler.execute(1, makeFile({ size: 7.3 * MB }))).rejects.toThrow(/7\.3 MB/);
        });
    });

    describe('guardrail — serviço de jobs indisponível', () => {
        it('lança ServiceUnavailableException quando jobs.create falha', async () => {
            const { handler, jobs } = makeHandler();
            jobs.create.mockRejectedValue(new Error('connection refused'));

            await expect(handler.execute(1, makeFile())).rejects.toThrow(ServiceUnavailableException);
        });
    });

    describe('happy path', () => {
        it('retorna jobId e streamToken', async () => {
            const { handler } = makeHandler();

            const result = await handler.execute(1, makeFile());

            expect(result.jobId).toBe('job-1');
            expect(result.streamToken).toBe('token-abc');
        });

        it('publica mensagem OCR após upload bem-sucedido', async () => {
            const { handler, producerRegistry } = makeHandler();
            const publish = jest.fn();
            producerRegistry.get.mockReturnValue({ publish });

            await handler.execute(1, makeFile());

            expect(publish).toHaveBeenCalledTimes(1);
            expect(publish).toHaveBeenCalledWith(
                expect.objectContaining({ data: expect.objectContaining({ jobId: 'job-1' }) }),
            );
        });

        it('não publica OCR se producer não estiver registrado', async () => {
            const { handler, producerRegistry } = makeHandler();
            producerRegistry.get.mockReturnValue(null);

            await expect(handler.execute(1, makeFile())).resolves.not.toThrow();
        });
    });
});
