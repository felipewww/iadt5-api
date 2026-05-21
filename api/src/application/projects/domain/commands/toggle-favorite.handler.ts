import { projectsBucket } from '@/application/projects/infra/s3/projects-bucket';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from '@/application/projects/infra/db/postgres/projects.repository';
import { ProjectOutput } from '@/domain/dtos/projects/outputs/project.output';
import { S3Service } from '@/infra/aws/s3/s3.service';

@Injectable()
export class ToggleFavoriteHandler {
    constructor(
        private readonly repository: ProjectsRepository,
        private readonly s3: S3Service,
    ) {}

    async execute(id: number): Promise<ProjectOutput> {
        const existing = await this.repository.findById(id);
        if (!existing) throw new NotFoundException('Projeto não encontrado');

        const project = await this.repository.transaction((trx) =>
            this.repository.update(id, { favorite: !existing.favorite }, trx),
        );

        const [photoUrl, originalPhotoUrl] = await Promise.all([
            project.thumbnail_key ? this.s3.createPresignedGetUrl(project.thumbnail_key, projectsBucket) : null,
            project.original_key ? this.s3.createPresignedGetUrl(project.original_key, projectsBucket) : null,
        ]);

        return ProjectOutput.from(project, photoUrl, originalPhotoUrl);
    }
}
