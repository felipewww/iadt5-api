import { Module } from '@nestjs/common';
import { LlmModule } from '@/infra/llm/llm.module';
import { MongoDBModule } from '@/infra/mongodb/mongodb.module';
import { AnalysisGraphService } from './analysis.graph';

@Module({
    imports: [LlmModule, MongoDBModule],
    providers: [AnalysisGraphService],
    exports: [AnalysisGraphService],
})
export class GraphModule {}
