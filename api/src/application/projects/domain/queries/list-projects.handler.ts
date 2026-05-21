import { projectsBucket } from '@/application/projects/infra/s3/projects-bucket';
import { Injectable } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { ListProjectsQuery } from '@/domain/dtos/projects/queries/list-projects.query';
import { ProjectOutput } from '@/domain/dtos/projects/outputs/project.output';
import { ProjectsRepository } from '@/application/projects/infra/db/postgres/projects.repository';
import { S3Service } from '@/infra/aws/s3/s3.service';

@Injectable()
export class ListProjectsHandler implements Handler<ListProjectsQuery, ProjectOutput[]> {
    constructor(
        private readonly repository: ProjectsRepository,
        private readonly s3: S3Service,
    ) {}

    async execute(query: ListProjectsQuery, _ctx: RequestContext): Promise<ProjectOutput[]> {
        const projects = await this.repository.getBy(query);

        return Promise.all(
            projects.map(async (p) => {
                const [photoUrl, originalPhotoUrl] = await Promise.all([
                    p.thumbnail_key ? this.s3.createPresignedGetUrl(p.thumbnail_key, projectsBucket) : null,
                    p.original_key ? this.s3.createPresignedGetUrl(p.original_key, projectsBucket) : null,
                ]);
                return ProjectOutput.from(p, photoUrl, originalPhotoUrl);
            }),
        );
    }
}
