import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { AnalysisPipelineService } from './analysis-pipeline.service';

@Module({
    providers: [JobsService, AnalysisPipelineService],
    exports: [JobsService, AnalysisPipelineService],
})
export class JobsModule {}
