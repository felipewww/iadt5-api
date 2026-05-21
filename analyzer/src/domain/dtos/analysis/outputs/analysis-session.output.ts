import { ApiProperty } from '@nestjs/swagger';
import { AnalysisSessionReadModel, AnalysisStatus } from '@/domain/read-models/analysis/analysis-session.read-model';
import { EvaluationOutput } from './evaluation.output';

export class AnalysisSessionOutput {
    @ApiProperty() sessionId!: string;
    @ApiProperty({ enum: ['analyzing', 'awaiting_user', 'completed'] }) status!: AnalysisStatus;
    @ApiProperty() filename!: string;
    @ApiProperty({ type: [String] }) pendingQuestions!: string[];
    @ApiProperty({ nullable: true, type: () => EvaluationOutput }) evaluation!: EvaluationOutput | null;

    static from(this: void, model: AnalysisSessionReadModel): AnalysisSessionOutput {
        const output = new AnalysisSessionOutput();
        output.sessionId = model.sessionId;
        output.status = model.status;
        output.filename = model.filename;
        output.pendingQuestions = model.pendingQuestions;
        output.evaluation = model.evaluation ? EvaluationOutput.from(model.evaluation) : null;
        return output;
    }
}
