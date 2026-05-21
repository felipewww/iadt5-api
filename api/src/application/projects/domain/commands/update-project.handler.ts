import { projectsBucket } from '@/application/projects/infra/s3/projects-bucket';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { UpdateProjectCommand } from '@/domain/dtos/projects/commands/update-project.command';
import { ProjectOutput } from '@/domain/dtos/projects/outputs/project.output';
import { ProjectsRepository } from '@/application/projects/infra/db/postgres/projects.repository';
import { S3Service } from '@/infra/aws/s3/s3.service';

@Injectable()
export class UpdateProjectHandler implements Handler<UpdateProjectCommand, ProjectOutput> {
    constructor(
        private readonly repository: ProjectsRepository,
        private readonly s3: S3Service,
    ) {}

    async execute(input: UpdateProjectCommand & { id: number }, _ctx: RequestContext): Promise<ProjectOutput> {
        const existing = await this.repository.findById(input.id);
        if (!existing) throw new NotFoundException('Projeto não encontrado');

        const project = await this.repository.transaction((trx) =>
            this.repository.update(
                input.id,
                {
                    ...(input.name !== undefined && { name: input.name }),
                    ...(input.customerName !== undefined && { customer_name: input.customerName }),
                    ...(input.dateStart !== undefined && { date_start: new Date(input.dateStart) }),
                    ...(input.dateEnd !== undefined && { date_end: new Date(input.dateEnd) }),
                },
                trx,
            ),
        );

        const [photoUrl, originalPhotoUrl] = await Promise.all([
            project.thumbnail_key ? this.s3.createPresignedGetUrl(project.thumbnail_key, projectsBucket) : null,
            project.original_key ? this.s3.createPresignedGetUrl(project.original_key, projectsBucket) : null,
        ]);

        return ProjectOutput.from(project, photoUrl, originalPhotoUrl);
    }
}
