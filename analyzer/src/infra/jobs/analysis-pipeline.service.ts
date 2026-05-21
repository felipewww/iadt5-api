import { Injectable, Logger } from '@nestjs/common';
import { AnalysisState, ArchitectureJson } from '@/infra/graph/analysis.state';
import { JobsService } from './jobs.service';

function validateConsistency(json: ArchitectureJson): string[] {
    const issues: string[] = [];
    const names = new Set(json.components.map(c => c.name));

    for (const r of json.relationships) {
        if (!names.has(r.from)) issues.push(`Relacionamento com origem desconhecida: "${r.from}"`);
        if (!names.has(r.to))   issues.push(`Relacionamento com destino desconhecido: "${r.to}"`);
    }

    return issues;
}

@Injectable()
export class AnalysisPipelineService {
    private readonly logger = new Logger(AnalysisPipelineService.name);

    constructor(private readonly jobsService: JobsService) {}

    async processState(jobId: string, state: AnalysisState): Promise<void> {
        if (state.pendingQuestions?.length > 0) {
            this.logger.log(`[PIPELINE] LLM tem dúvidas | job=${jobId} questions=${state.pendingQuestions.length}`);
            await this.jobsService.addStep(jobId, {
                name: 'analyzer-awaiting-reply',
                data: { questions: state.pendingQuestions },
                status: 1,
            });
            // Job permanece RUNNING — aguarda resposta do usuário
            return;
        }

        if (state.evaluation) {
            const consistencyIssues = state.architectureJson
                ? validateConsistency(state.architectureJson)
                : ['architectureJson ausente'];

            if (consistencyIssues.length > 0) {
                this.logger.warn(`[PIPELINE] inconsistências na arquitetura | job=${jobId} issues=${consistencyIssues.join('; ')}`);
            }

            this.logger.log(`[PIPELINE] análise concluída | job=${jobId} score=${state.evaluation.score}`);
            await this.jobsService.addStep(jobId, {
                name: 'analyzer-result',
                data: {
                    score: state.evaluation.score,
                    summary: state.evaluation.summary,
                    strengths: state.evaluation.strengths,
                    weaknesses: state.evaluation.weaknesses,
                    recommendations: state.evaluation.recommendations,
                    components_count: state.architectureJson?.components?.length ?? 0,
                    architecture_json: state.architectureJson,
                    consistency_issues: consistencyIssues,
                },
                status: 1,
            });
            await this.jobsService.patchStatus(jobId, 'DONE');
            return;
        }

        this.logger.warn(`[PIPELINE] estado inesperado após execução | job=${jobId}`);
    }
}
