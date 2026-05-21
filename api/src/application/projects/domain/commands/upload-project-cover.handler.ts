import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from '@/application/projects/infra/db/postgres/projects.repository';
import { S3Service } from '@/infra/aws/s3/s3.service';
import { ProjectOutput } from '@/domain/dtos/projects/outputs/project.output';
import { projectsBucket } from '@/application/projects/infra/s3/projects-bucket';
import { MulterFile } from '@/infra/aws/s3/multer-file.type';
import { DocumentsService } from '@/infra/documents/documents.service';

@Injectable()
export class UploadProjectCoverHandler {
    constructor(
        private readonly repository: ProjectsRepository,
        private readonly s3: S3Service,
        private readonly documents: DocumentsService,
    ) {}

    async execute(id: number, file: MulterFile): Promise<ProjectOutput> {
        const existing = await this.repository.findById(id);
        if (!existing) throw new NotFoundException('Projeto não encontrado');

        const doc = await this.documents.upload(file, {
            folder: `projects/${id}`,
            bucket: projectsBucket,
            thumbnail: { width: 400, height: 300 },
        });

        const project = await this.repository.transaction((trx) =>
            this.repository.update(id, { cover_document_id: doc.id }, trx),
        );

        const [photoUrl, originalPhotoUrl] = await Promise.all([
            project.thumbnail_key ? this.s3.createPresignedGetUrl(project.thumbnail_key, projectsBucket) : null,
            project.original_key ? this.s3.createPresignedGetUrl(project.original_key, projectsBucket) : null,
        ]);

        return ProjectOutput.from(project, photoUrl, originalPhotoUrl);
    }
}
