import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { ReplyAnalysisCommand } from '@/domain/dtos/analysis/commands/reply-analysis.command';
import { AnalysisSessionOutput } from '@/domain/dtos/analysis/outputs/analysis-session.output';
import { AnalysisGraphService } from '@/infra/graph/analysis.graph';
import { AnalysisPipelineService } from '@/infra/jobs/analysis-pipeline.service';
import { stateToReadModel } from '../../analysis.mapper';

export class ReplyAnalysisInput {
    sessionId!: string;
    command!: ReplyAnalysisCommand;
}

@Injectable()
export class ReplyAnalysisHandler implements Handler<ReplyAnalysisInput, AnalysisSessionOutput> {
    constructor(
        private readonly graphService: AnalysisGraphService,
        private readonly pipelineService: AnalysisPipelineService,
    ) {}

    async execute(input: ReplyAnalysisInput): Promise<AnalysisSessionOutput> {
        const current = await this.graphService.getState(input.sessionId);
        if (!current) {
            throw new NotFoundException(`Session ${input.sessionId} not found`);
        }

        const state = await this.graphService.resume(input.sessionId, input.command.answer);

        // sessionId = jobId no pipeline — atualiza o job com o novo estado
        await this.pipelineService.processState(input.sessionId, state);

        return AnalysisSessionOutput.from(stateToReadModel(input.sessionId, state));
    }
}
