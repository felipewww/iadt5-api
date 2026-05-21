import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from '@/application/projects/infra/db/postgres/projects.repository';
import { JobsService } from '@/infra/jobs/jobs.service';

@Injectable()
export class CancelProjectAnalysisHandler {
    constructor(
        private readonly repository: ProjectsRepository,
        private readonly jobs: JobsService,
    ) {}

    async execute(projectId: number): Promise<void> {
        const project = await this.repository.findById(projectId);
        if (!project) throw new NotFoundException('Projeto não encontrado');
        if (!project.analysis_job_id) throw new NotFoundException('Nenhuma análise em andamento para este projeto');

        await this.jobs.patchStatus(project.analysis_job_id, 'FAILED', 'Cancelado pelo usuário');

        await this.repository.transaction((trx) =>
            this.repository.update(projectId, { analysis_job_id: null, analysis_status: null }, trx),
        );
    }
}
