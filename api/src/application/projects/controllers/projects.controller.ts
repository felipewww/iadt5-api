import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterFile } from '@/infra/aws/s3/multer-file.type';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@/infra/framework/permissions/roles.decorator';
import { Context } from '@/infra/framework/context/context.decorator';
import { RequestContext } from '@/infra/framework/context/request-context';
import { HashId } from '@/infra/hash-id/hash-id.param.decorator';
import { SysModules } from '@/domain/permissions/sys-modules';
import { PermissionsContracts } from '@/infra/framework/permissions/permissions.contracts';
import { CreateProjectCommand } from '@/domain/dtos/projects/commands/create-project.command';
import { UpdateProjectCommand } from '@/domain/dtos/projects/commands/update-project.command';
import { ListProjectsQuery } from '@/domain/dtos/projects/queries/list-projects.query';
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

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
    constructor(
        private readonly createHandler: CreateProjectHandler,
        private readonly updateHandler: UpdateProjectHandler,
        private readonly deleteHandler: DeleteProjectHandler,
        private readonly getHandler: GetProjectHandler,
        private readonly listHandler: ListProjectsHandler,
        private readonly toggleFavoriteHandler: ToggleFavoriteHandler,
        private readonly uploadCoverHandler: UploadProjectCoverHandler,
        private readonly uploadAnalysisHandler: UploadProjectAnalysisHandler,
        private readonly replyAnalysisHandler: ReplyProjectAnalysisHandler,
        private readonly getAnalysisTokenHandler: GetAnalysisTokenHandler,
        private readonly cancelAnalysisHandler: CancelProjectAnalysisHandler,
    ) {}

    @Post()
    @Roles(SysModules.projects, [PermissionsContracts.create])
    create(@Body() body: CreateProjectCommand, @Context() ctx: RequestContext) {
        return this.createHandler.execute(body, ctx);
    }

    @Get()
    @Roles(SysModules.projects, [PermissionsContracts.read])
    list(@Query() query: ListProjectsQuery, @Context() ctx: RequestContext) {
        return this.listHandler.execute(query, ctx);
    }

    @Get(':id')
    @Roles(SysModules.projects, [PermissionsContracts.read])
    getOne(@HashId('id') id: number) {
        return this.getHandler.execute(id);
    }

    @Put(':id')
    @Roles(SysModules.projects, [PermissionsContracts.update])
    update(@HashId('id') id: number, @Body() body: UpdateProjectCommand, @Context() ctx: RequestContext) {
        return this.updateHandler.execute({ ...body, id }, ctx);
    }

    @Patch(':id/favorite')
    @Roles(SysModules.projects, [PermissionsContracts.update])
    toggleFavorite(@HashId('id') id: number) {
        return this.toggleFavoriteHandler.execute(id);
    }

    @Patch(':id/cover')
    @Roles(SysModules.projects, [PermissionsContracts.update])
    @UseInterceptors(FileInterceptor('file'))
    uploadCover(@HashId('id') id: number, @UploadedFile() file: MulterFile) {
        return this.uploadCoverHandler.execute(id, file);

    }

    @Post(':id/analysis')
    @Roles(SysModules.projects, [PermissionsContracts.update])
    @UseInterceptors(FileInterceptor('file'))
    uploadAnalysis(@HashId('id') id: number, @UploadedFile() file: MulterFile) {
        return this.uploadAnalysisHandler.execute(id, file);
    }

    @Post(':id/analysis/reply')
    @Roles(SysModules.projects, [PermissionsContracts.update])
    replyAnalysis(@HashId('id') id: number, @Body() body: { answer: string }) {
        return this.replyAnalysisHandler.execute({ projectId: id, answer: body.answer });
    }

    @Get(':id/analysis/token')
    @Roles(SysModules.projects, [PermissionsContracts.read])
    getAnalysisToken(@HashId('id') id: number) {
        return this.getAnalysisTokenHandler.execute(id);
    }

    @Delete(':id/analysis')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Roles(SysModules.projects, [PermissionsContracts.update])
    cancelAnalysis(@HashId('id') id: number) {
        return this.cancelAnalysisHandler.execute(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Roles(SysModules.projects, [PermissionsContracts.delete])
    remove(@HashId('id') id: number) {
        return this.deleteHandler.execute(id);
    }
}
