import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Handler } from '@/infra/framework/handler';
import { StartAnalysisCommand } from '@/domain/dtos/analysis/commands/start-analysis.command';
import { AnalysisSessionOutput } from '@/domain/dtos/analysis/outputs/analysis-session.output';
import { OcrService } from '@/infra/ocr/ocr.service';
import { AnalysisGraphService } from '@/infra/graph/analysis.graph';
import { stateToReadModel } from '../../analysis.mapper';

@Injectable()
export class StartAnalysisHandler implements Handler<StartAnalysisCommand, AnalysisSessionOutput> {
    constructor(
        private readonly ocrService: OcrService,
        private readonly graphService: AnalysisGraphService,
    ) {}

    async execute(input: StartAnalysisCommand): Promise<AnalysisSessionOutput> {
        const sessionId = randomUUID();
        const { buffer, originalname, mimetype } = input.file;

        const ocr = await this.ocrService.extract(buffer, originalname, mimetype);

        const state = await this.graphService.start({
            sessionId,
            filename:          originalname,
            fileContentBase64: buffer.toString('base64'),
            fileMimeType:      mimetype,
            ocrText:           ocr.full_text,
        });

        return AnalysisSessionOutput.from(stateToReadModel(sessionId, state));
    }
}
