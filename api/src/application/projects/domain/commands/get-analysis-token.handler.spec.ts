import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { GetAnalysisTokenHandler } from './get-analysis-token.handler';

jest.mock('@/application/projects/infra/db/postgres/projects.repository', () => ({
    ProjectsRepository: jest.fn(),
}));
jest.mock('@/infra/jobs/jobs.service', () => ({ JobsService: jest.fn() }));

const now = new Date();
const mockProject = { id: 1, analysis_job_id: 'job-abc', created_at: now, updated_at: now };

function makeHandler(findByIdResult: unknown = mockProject, generateTokenResult: unknown = 'stream-token') {
    const repository = { findById: jest.fn().mockResolvedValue(findByIdResult) };
    const jobs = {
        generateToken: typeof generateTokenResult === 'string'
            ? jest.fn().mockResolvedValue(generateTokenResult)
            : jest.fn().mockRejectedValue(generateTokenResult),
    };
    return { handler: new GetAnalysisTokenHandler(repository as never, jobs as never) };
}

describe('GetAnalysisTokenHandler', () => {
    it('lança NotFoundException quando projeto não existe', async () => {
        const { handler } = makeHandler(null);

        await expect(handler.execute(99)).rejects.toThrow(NotFoundException);
    });

    it('lança NotFoundException quando projeto não tem análise', async () => {
        const { handler } = makeHandler({ ...mockProject, analysis_job_id: null });

        await expect(handler.execute(1)).rejects.toThrow('Nenhuma análise para este projeto');
    });

    it('lança ServiceUnavailableException quando jobs.generateToken falha', async () => {
        const { handler } = makeHandler(mockProject, new Error('timeout'));

        await expect(handler.execute(1)).rejects.toThrow(ServiceUnavailableException);
    });

    it('retorna jobId e streamToken', async () => {
        const { handler } = makeHandler();

        const result = await handler.execute(1);

        expect(result.jobId).toBe('job-abc');
        expect(result.streamToken).toBe('stream-token');
    });
});
