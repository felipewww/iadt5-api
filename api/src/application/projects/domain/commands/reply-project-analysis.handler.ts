import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from '@/application/projects/infra/db/postgres/projects.repository';

export class ReplyProjectAnalysisInput {
    projectId!: number;
    answer!: string;
}

@Injectable()
export class ReplyProjectAnalysisHandler {
    private readonly analyzerUrl = process.env.ANALYZER_SERVICE_URL ?? 'http://fiap-analyzer:3300';

    constructor(private readonly repository: ProjectsRepository) {}

    async execute(input: ReplyProjectAnalysisInput): Promise<void> {
        const project = await this.repository.findById(input.projectId);
        if (!project) throw new NotFoundException('Projeto não encontrado');
        if (!project.analysis_job_id) throw new NotFoundException('Nenhuma análise em andamento para este projeto');

        // Marca RUNNING imediatamente — o LLM pode demorar; o frontend acompanha via SSE
        await this.repository.transaction((trx) =>
            this.repository.update(input.projectId, { analysis_status: 'RUNNING' }, trx),
        );

        // Fire-and-forget — não bloqueia o request
        fetch(`${this.analyzerUrl}/analysis/${project.analysis_job_id}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer: input.answer }),
        }).catch(() => { /* erros serão visíveis via job FAILED no SSE */ });
    }
}
