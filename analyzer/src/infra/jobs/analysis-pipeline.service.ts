import { Injectable, Logger } from '@nestjs/common';
import { AnalysisState } from '@/infra/graph/analysis.state';
import { JobsService } from './jobs.service';

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
                },
                status: 1,
            });
            await this.jobsService.patchStatus(jobId, 'DONE');
            return;
        }

        this.logger.warn(`[PIPELINE] estado inesperado após execução | job=${jobId}`);
    }
}
