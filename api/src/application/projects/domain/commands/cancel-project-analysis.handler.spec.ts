import { NotFoundException } from '@nestjs/common';
import { CancelProjectAnalysisHandler } from './cancel-project-analysis.handler';

jest.mock('@/application/projects/infra/db/postgres/projects.repository', () => ({
    ProjectsRepository: jest.fn(),
}));
jest.mock('@/infra/jobs/jobs.service', () => ({ JobsService: jest.fn() }));

const now = new Date();
const mockProject = {
    id: 1, name: 'Projeto X', analysis_job_id: 'job-abc',
    created_at: now, updated_at: now,
};

function makeHandler(findByIdResult: unknown = mockProject) {
    const repository = {
        findById:    jest.fn().mockResolvedValue(findByIdResult),
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        update:      jest.fn().mockResolvedValue(mockProject),
    };
    const jobs = { patchStatus: jest.fn().mockResolvedValue(undefined) };
    return { handler: new CancelProjectAnalysisHandler(repository as never, jobs as never), repository, jobs };
}

describe('CancelProjectAnalysisHandler', () => {
    it('lança NotFoundException quando projeto não existe', async () => {
        const { handler } = makeHandler(null);

        await expect(handler.execute(99)).rejects.toThrow(NotFoundException);
    });

    it('lança NotFoundException quando não há análise em andamento', async () => {
        const { handler } = makeHandler({ ...mockProject, analysis_job_id: null });

        await expect(handler.execute(1)).rejects.toThrow('Nenhuma análise em andamento');
    });

    it('marca o job como FAILED com mensagem de cancelamento', async () => {
        const { handler, jobs } = makeHandler();

        await handler.execute(1);

        expect(jobs.patchStatus).toHaveBeenCalledWith('job-abc', 'FAILED', 'Cancelado pelo usuário');
    });

    it('limpa analysis_job_id e analysis_status do projeto', async () => {
        const { handler, repository } = makeHandler();

        await handler.execute(1);

        expect(repository.update).toHaveBeenCalledWith(
            1,
            { analysis_job_id: null, analysis_status: null },
            expect.anything(),
        );
    });
});
