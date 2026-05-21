import { ApiProperty } from '@nestjs/swagger';
import { EvaluationReadModel } from '@/domain/read-models/analysis/evaluation.read-model';

export class EvaluationOutput {
    @ApiProperty() score!: number;
    @ApiProperty() summary!: string;
    @ApiProperty({ type: [String] }) strengths!: string[];
    @ApiProperty({ type: [String] }) weaknesses!: string[];
    @ApiProperty({ type: [String] }) recommendations!: string[];

    static from(this: void, model: EvaluationReadModel): EvaluationOutput {
        const output = new EvaluationOutput();
        output.score = model.score;
        output.summary = model.summary;
        output.strengths = model.strengths;
        output.weaknesses = model.weaknesses;
        output.recommendations = model.recommendations;
        return output;
    }
}
