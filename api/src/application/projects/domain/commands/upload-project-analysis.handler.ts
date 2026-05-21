import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ProjectsRepository } from '@/application/projects/infra/db/postgres/projects.repository';
import { DocumentsService } from '@/infra/documents/documents.service';
import { JobsService } from '@/infra/jobs/jobs.service';
import { S3Service } from '@/infra/aws/s3/s3.service';
import { ProducerRegistry } from '@/infra/rabbitmq/producer-registry.service';
import { OcrRequestMessage } from '@/infra/rabbitmq/messages/ocr-request.message';
import { MulterFile } from '@/infra/aws/s3/multer-file.type';
import { AnalysisUploadOutput } from '@/domain/dtos/projects/outputs/analysis-upload.output';
import { projectsBucket } from '@/application/projects/infra/s3/projects-bucket';
import { manifest } from '@/infra/manifest/manifest';

const THREE_DAYS_SECONDS = 60 * 60 * 24 * 3;
const MAX_FILE_BYTES     = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp']);

@Injectable()
export class UploadProjectAnalysisHandler {
    constructor(
        private readonly repository: ProjectsRepository,
        private readonly documents: DocumentsService,
        private readonly jobs: JobsService,
        private readonly s3: S3Service,
        private readonly producerRegistry: ProducerRegistry,
    ) {}

    async execute(projectId: number, file: MulterFile): Promise<AnalysisUploadOutput> {
        const existing = await this.repository.findById(projectId);
        if (!existing) throw new NotFoundException('Projeto não encontrado');

        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            throw new BadRequestException('Tipo de arquivo não suportado. Envie um PDF ou imagem (PNG, JPEG, GIF, WEBP).');
        }

        if (file.size > MAX_FILE_BYTES) {
            throw new BadRequestException(
                `Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)} MB. O limite é ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
            );
        }

        let jobResult: Awaited<ReturnType<JobsService['create']>>;
        try {
            jobResult = await this.jobs.create({
                tenantId: manifest.uid,
                type: 'architecture-analysis',
                payload: { projectId },
            });
        } catch {
            throw new ServiceUnavailableException('Serviço de análise indisponível. Tente novamente mais tarde.');
        }

        const { jobId, streamToken } = jobResult;

        const doc = await this.documents.upload(file, {
            folder: `projects/${projectId}/analysis`,
            bucket: projectsBucket,
            namePrefix: jobId,
        });

        await this.repository.transaction((trx) =>
            this.repository.update(
                projectId,
                { analysis_document_id: doc.id, analysis_job_id: jobId, analysis_status: 'RUNNING' },
                trx,
            ),
        );

        const fileUrl = await this.s3.createPresignedGetUrl(doc.original_key, projectsBucket, THREE_DAYS_SECONDS);

        await this.jobs.addStep(jobId, { name: 'api-upload', data: 'File uploaded', status: 1 });

        this.producerRegistry.get<OcrRequestMessage>('PRODUCER_OCR')?.publish({
            tenant: { id: manifest.tenatId, schema: manifest.uid, location: manifest.projectId },
            data: { jobId, projectId, fileUrl, fileName: file.originalname },
        });

        return AnalysisUploadOutput.from(jobId, streamToken);
    }
}
