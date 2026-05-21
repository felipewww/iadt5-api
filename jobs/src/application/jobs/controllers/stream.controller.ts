import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { TokenService } from '@/infra/token/token.service';
import { JobRepository } from '@/application/jobs/infra/db/mongo/job.repository';
import { JobStatus } from '@/domain/enums/job-status.enum';
import { JobReadModel } from '@/domain/read-models/job/job.read-model';

const TERMINAL = new Set([JobStatus.DONE, JobStatus.FAILED]);

@ApiTags('Jobs')
@Controller('jobs')
export class StreamController {
    constructor(
        private readonly tokenService:  TokenService,
        private readonly jobRepository: JobRepository,
    ) {}

    @Get(':jobId/stream')
    @ApiOperation({ summary: 'SSE stream de status do job — requer token assinado pela API do cliente' })
    @ApiQuery({ name: 'token', required: true })
    async stream(
        @Param('jobId') jobId: string,
        @Query('token') token: string,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        await this.tokenService.verify(token, jobId);

        res.setHeader('Content-Type',  'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection',    'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // desativa buffer do nginx
        res.flushHeaders();

        const send = (event: string, data: unknown) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        // Envia o status atual imediatamente — frontend não precisa esperar o próximo update
        const current = await this.jobRepository.findById(jobId);
        if (!current) {
            send('error', { message: 'Job não encontrado' });
            res.end();
            return;
        }

        send('status', current);

        if (TERMINAL.has(current.status)) {
            res.end();
            return;
        }

        // Change Stream — fica ouvindo updates deste jobId no MongoDB
        const changeStream = this.jobRepository.watchJob(jobId);

        changeStream.on('change', (change) => {
            if (change.operationType !== 'update' || !change.fullDocument) return;

            const doc = change.fullDocument as unknown as JobReadModel & { _id: string };
            const readModel: JobReadModel = {
                jobId:     doc._id,
                tenantId:  doc.tenantId,
                type:      doc.type,
                status:    doc.status,
                payload:   doc.payload,
                result:    doc.result,
                error:     doc.error,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };

            send('status', readModel);

            if (TERMINAL.has(readModel.status)) {
                changeStream.close();
                res.end();
            }
        });

        changeStream.on('error', () => {
            send('error', { message: 'Erro interno no stream' });
            changeStream.close();
            res.end();
        });

        // Fecha o Change Stream quando o cliente desconecta
        req.on('close', () => changeStream.close());
    }
}
