import { NotFoundException } from '@nestjs/common';
import { ReplyProjectAnalysisHandler } from './reply-project-analysis.handler';

jest.mock('@/application/projects/infra/db/postgres/projects.repository', () => ({
    ProjectsRepository: jest.fn(),
}));

const now = new Date();
const mockProject = { id: 1, analysis_job_id: 'job-abc', created_at: now, updated_at: now };

function makeHandler(findByIdResult: unknown = mockProject) {
    const repository = {
        findById:    jest.fn().mockResolvedValue(findByIdResult),
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        update:      jest.fn().mockResolvedValue(mockProject),
    };
    return { handler: new ReplyProjectAnalysisHandler(repository as never), repository };
}

describe('ReplyProjectAnalysisHandler', () => {
    beforeEach(() => {
        (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({});
    });

    it('lança NotFoundException quando projeto não existe', async () => {
        const { handler } = makeHandler(null);

        await expect(handler.execute({ projectId: 99, answer: 'resp' })).rejects.toThrow(NotFoundException);
    });

    it('lança NotFoundException quando não há análise em andamento', async () => {
        const { handler } = makeHandler({ ...mockProject, analysis_job_id: null });

        await expect(handler.execute({ projectId: 1, answer: 'resp' })).rejects.toThrow('Nenhuma análise em andamento');
    });

    it('marca o projeto como RUNNING antes de disparar a resposta', async () => {
        const { handler, repository } = makeHandler();

        await handler.execute({ projectId: 1, answer: 'resposta' });

        expect(repository.update).toHaveBeenCalledWith(1, { analysis_status: 'RUNNING' }, expect.anything());
    });

    it('dispara fetch para o analyzer com a resposta (fire-and-forget)', async () => {
        const { handler } = makeHandler();

        await handler.execute({ projectId: 1, answer: 'resposta do usuário' });

        expect((global as unknown as { fetch: jest.Mock }).fetch).toHaveBeenCalledWith(
            expect.stringContaining('/analysis/job-abc/reply'),
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('não lança erro se fetch falhar', async () => {
        (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockRejectedValue(new Error('network error'));
        const { handler } = makeHandler();

        await expect(handler.execute({ projectId: 1, answer: 'resp' })).resolves.not.toThrow();
    });
});
