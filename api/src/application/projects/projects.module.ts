import { Module } from '@nestjs/common';
import { AwsModule } from '@/infra/aws/aws.module';
import { DocumentsModule } from '@/infra/documents/documents.module';
import { JobsModule } from '@/infra/jobs/jobs.module';
import { ProjectsController } from '@/application/projects/controllers/projects.controller';
import { ProjectsRepository } from '@/application/projects/infra/db/postgres/projects.repository';
import { CreateProjectHandler } from '@/application/projects/domain/commands/create-project.handler';
import { UpdateProjectHandler } from '@/application/projects/domain/commands/update-project.handler';
import { DeleteProjectHandler } from '@/application/projects/domain/commands/delete-project.handler';
import { GetProjectHandler } from '@/application/projects/domain/queries/get-project.handler';
import { ListProjectsHandler } from '@/application/projects/domain/queries/list-projects.handler';
import { ToggleFavoriteHandler } from '@/application/projects/domain/commands/toggle-favorite.handler';
import { UploadProjectCoverHandler } from '@/application/projects/domain/commands/upload-project-cover.handler';
import { UploadProjectAnalysisHandler } from '@/application/projects/domain/commands/upload-project-analysis.handler';
import { ReplyProjectAnalysisHandler } from '@/application/projects/domain/commands/reply-project-analysis.handler';
import { GetAnalysisTokenHandler } from '@/application/projects/domain/commands/get-analysis-token.handler';
import { CancelProjectAnalysisHandler } from '@/application/projects/domain/commands/cancel-project-analysis.handler';

@Module({
    imports: [AwsModule, DocumentsModule, JobsModule],
    controllers: [ProjectsController],
    providers: [
        ProjectsRepository,
        CreateProjectHandler,
        UpdateProjectHandler,
        DeleteProjectHandler,
        GetProjectHandler,
        ListProjectsHandler,
        ToggleFavoriteHandler,
        UploadProjectCoverHandler,
        UploadProjectAnalysisHandler,
        ReplyProjectAnalysisHandler,
        GetAnalysisTokenHandler,
        CancelProjectAnalysisHandler,
    ],
})
export class ProjectsModule {}
