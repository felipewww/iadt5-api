import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { StartAnalysisCommand } from '@/domain/dtos/analysis/commands/start-analysis.command';
import { ReplyAnalysisCommand } from '@/domain/dtos/analysis/commands/reply-analysis.command';
import { AnalysisSessionOutput } from '@/domain/dtos/analysis/outputs/analysis-session.output';
import { StartAnalysisHandler } from '../domain/commands/start-analysis.handler';
import { ReplyAnalysisHandler } from '../domain/commands/reply-analysis.handler';
import { GetAnalysisHandler } from '../domain/queries/get-analysis.handler';

@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
    constructor(
        private readonly startHandler: StartAnalysisHandler,
        private readonly replyHandler: ReplyAnalysisHandler,
        private readonly getHandler: GetAnalysisHandler,
    ) {}

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
    async start(@UploadedFile() file: Express.Multer.File): Promise<AnalysisSessionOutput> {
        const command = new StartAnalysisCommand();
        command.file = file;
        return this.startHandler.execute(command);
    }

    @Post(':id/reply')
    async reply(
        @Param('id') id: string,
        @Body() body: ReplyAnalysisCommand,
    ): Promise<AnalysisSessionOutput> {
        return this.replyHandler.execute({ sessionId: id, command: body });
    }

    @Get(':id')
    async get(@Param('id') id: string): Promise<AnalysisSessionOutput> {
        return this.getHandler.execute(id);
    }
}
