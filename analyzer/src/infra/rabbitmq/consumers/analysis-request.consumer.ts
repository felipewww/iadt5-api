import { Logger } from '@nestjs/common';
import axios from 'axios';
import { Consumer, IMessagePattern } from 'src/infra/framework/rabbitmq/Consumer';
import { Queues } from '@/infra/rabbitmq/queues';
import { AnalyzerRequestMessage } from '@/infra/rabbitmq/messages/analyzer-request.message';
import { JobsService } from '@/infra/jobs/jobs.service';
import { AnalysisPipelineService } from '@/infra/jobs/analysis-pipeline.service';
import { AnalysisGraphService } from '@/infra/graph/analysis.graph';
import { OcrResult } from '@/infra/ocr/ocr.service';

const MIME_TYPES: Record<string, string> = {
    pdf:  'application/pdf',
    png:  'image/png',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    gif:  'image/gif',
    webp: 'image/webp',
};

function getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    return MIME_TYPES[ext] ?? 'application/octet-stream';
}

export class AnalysisRequestConsumer extends Consumer<AnalyzerRequestMessage> {
    private readonly logger = new Logger(AnalysisRequestConsumer.name);

    constructor(
        private readonly jobsService: JobsService,
        private readonly graphService: AnalysisGraphService,
        private readonly pipelineService: AnalysisPipelineService,
    ) {
        super(Queues.QUEUE_ANALYZER);
    }

    protected async handler(message: IMessagePattern<AnalyzerRequestMessage>): Promise<void> {
        const { jobId, projectId, fileUrl, fileName, ocrResultUrl } = message.data;

        this.logger.log(`[ANALYZER] mensagem recebida | job=${jobId} project=${projectId} file=${fileName}`);

        try {
            this.logger.log(`[ANALYZER] baixando arquivo | job=${jobId}`);
            const fileRes = await axios.get<ArrayBuffer>(fileUrl, { responseType: 'arraybuffer' });
            this.logger.log(`[ANALYZER] arquivo baixado (${fileRes.data.byteLength} bytes) | job=${jobId}`);
            const fileContentBase64 = Buffer.from(fileRes.data).toString('base64');

            this.logger.log(`[ANALYZER] baixando resultado OCR | job=${jobId}`);
            const ocrRes = await axios.get<OcrResult>(ocrResultUrl);
            this.logger.log(`[ANALYZER] OCR carregado | pages=${ocrRes.data.total_pages} chars=${ocrRes.data.full_text.length} | job=${jobId}`);

            this.logger.log(`[ANALYZER] iniciando análise LangGraph | job=${jobId}`);
            const state = await this.graphService.start({
                sessionId: jobId,
                filename: fileName,
                fileContentBase64,
                fileMimeType: getMimeType(fileName),
                ocrText: ocrRes.data.full_text,
            });

            await this.pipelineService.processState(jobId, state);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`[ANALYZER] falha | job=${jobId}`, err);
            try {
                await this.jobsService.addStep(jobId, {
                    name: 'analyzer-error',
                    data: { message },
                    status: 0,
                });
            } catch { /* noop — não bloqueia o FAILED */ }
            await this.jobsService.patchStatus(jobId, 'FAILED', message);
            throw err;
        }
    }
}
