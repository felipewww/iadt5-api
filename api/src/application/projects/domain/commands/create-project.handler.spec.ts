import { CreateProjectHandler } from './create-project.handler';

jest.mock('@/application/projects/infra/db/postgres/projects.repository', () => ({
    ProjectsRepository: jest.fn(),
}));

const now = new Date();
const mockProject = {
    id: 1, name: 'Projeto X', customer_name: 'Cliente A',
    date_start: now, date_end: now,
    cover_document_id: null, analysis_document_id: null,
    analysis_job_id: null, analysis_status: null,
    favorite: false, thumbnail_key: null, original_key: null,
    created_at: now, updated_at: now,
};

function makeRepo(overrides: Record<string, unknown> = {}) {
    return {
        transaction: jest.fn().mockImplementation((cb: (trx: unknown) => unknown) => cb({})),
        create:      jest.fn().mockResolvedValue(mockProject),
        ...overrides,
    };
}

const cmd = { name: 'Projeto X', customerName: 'Cliente A', dateStart: '2026-01-01', dateEnd: '2026-12-31' };

describe('CreateProjectHandler', () => {
    it('cria o projeto e retorna ProjectOutput', async () => {
        const handler = new CreateProjectHandler(makeRepo() as never);

        const result = await handler.execute(cmd as never, {} as never);

        expect(result.id).toBe(mockProject.id);
        expect(result.name).toBe(mockProject.name);
    });

    it('photoUrl é null na criação', async () => {
        const handler = new CreateProjectHandler(makeRepo() as never);

        const result = await handler.execute(cmd as never, {} as never);

        expect(result.photoUrl).toBeNull();
        expect(result.originalPhotoUrl).toBeNull();
    });

    it('cria com favorite = false por padrão', async () => {
        const repo = makeRepo();
        const handler = new CreateProjectHandler(repo as never);

        await handler.execute(cmd as never, {} as never);

        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ favorite: false }),
            expect.anything(),
        );
    });
});
