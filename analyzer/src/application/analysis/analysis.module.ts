import { Module } from '@nestjs/common';
import { JobsModule } from '@/infra/jobs/jobs.module';
import { AnalysisController } from './controllers/analysis.controller';
import { StartAnalysisHandler } from './domain/commands/start-analysis.handler';
import { ReplyAnalysisHandler } from './domain/commands/reply-analysis.handler';
import { GetAnalysisHandler } from './domain/queries/get-analysis.handler';

@Module({
    imports: [JobsModule],
    controllers: [AnalysisController],
    providers: [StartAnalysisHandler, ReplyAnalysisHandler, GetAnalysisHandler],
})
export class AnalysisModule {}
