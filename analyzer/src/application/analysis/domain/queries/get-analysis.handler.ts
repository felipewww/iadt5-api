import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { AnalysisSessionOutput } from '@/domain/dtos/analysis/outputs/analysis-session.output';
import { AnalysisGraphService } from '@/infra/graph/analysis.graph';
import { stateToReadModel } from '../../analysis.mapper';

@Injectable()
export class GetAnalysisHandler implements Handler<string, AnalysisSessionOutput> {
    constructor(private readonly graphService: AnalysisGraphService) {}

    async execute(sessionId: string): Promise<AnalysisSessionOutput> {
        const state = await this.graphService.getState(sessionId);
        if (!state) {
            throw new NotFoundException(`Session ${sessionId} not found`);
        }
        return AnalysisSessionOutput.from(stateToReadModel(sessionId, state));
    }
}
