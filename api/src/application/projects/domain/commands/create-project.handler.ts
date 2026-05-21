import { Injectable } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { CreateProjectCommand } from '@/domain/dtos/projects/commands/create-project.command';
import { ProjectOutput } from '@/domain/dtos/projects/outputs/project.output';
import { ProjectsRepository } from '@/application/projects/infra/db/postgres/projects.repository';

@Injectable()
export class CreateProjectHandler implements Handler<CreateProjectCommand, ProjectOutput> {
    constructor(
        private readonly repository: ProjectsRepository,
    ) {}

    async execute(input: CreateProjectCommand, _ctx: RequestContext): Promise<ProjectOutput> {
        const project = await this.repository.transaction((trx) =>
            this.repository.create(
                {
                    name: input.name,
                    customer_name: input.customerName,
                    date_start: new Date(input.dateStart),
                    date_end: new Date(input.dateEnd),
                    cover_document_id: null,
                    analysis_document_id: null,
                    analysis_job_id: null,
                    analysis_status: null,
                    favorite: false,
                },
                trx,
            ),
        );

        return ProjectOutput.from({ ...project, original_key: null, thumbnail_key: null, analysis_job_id: null, analysis_status: null }, null, null);
    }
}
