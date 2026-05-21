import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ProjectsRepository } from '@/application/projects/infra/db/postgres/projects.repository';
import { JobsService } from '@/infra/jobs/jobs.service';
import { manifest } from '@/infra/manifest/manifest';

export class GetAnalysisTokenOutput {
    jobId!: string;
    streamToken!: string;
}

@Injectable()
export class GetAnalysisTokenHandler {
    constructor(
        private readonly repository: ProjectsRepository,
        private readonly jobs: JobsService,
    ) {}

    async execute(projectId: number): Promise<GetAnalysisTokenOutput> {
        const project = await this.repository.findById(projectId);
        if (!project) throw new NotFoundException('Projeto não encontrado');
        if (!project.analysis_job_id) throw new NotFoundException('Nenhuma análise para este projeto');

        try {
            const streamToken = await this.jobs.generateToken(project.analysis_job_id, manifest.uid);
            return { jobId: project.analysis_job_id, streamToken };
        } catch {
            throw new ServiceUnavailableException('Erro ao gerar token de monitoramento');
        }
    }
}
