import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LlmModule } from '@/infra/llm/llm.module';
import { OcrModule } from '@/infra/ocr/ocr.module';
import { GraphModule } from '@/infra/graph/graph.module';
import { JobsModule } from '@/infra/jobs/jobs.module';
import { MongoDBModule } from '@/infra/mongodb/mongodb.module';
import { RabbitConnectorModule } from '@/infra/rabbitmq/rabbit-connector.module';
import { HttpExceptionFilter } from '@/infra/framework/http/http-exception.filter';
import { GlobalInterceptor } from '@/infra/framework/http/global.interceptor';

@Global()
@Module({
    imports: [MongoDBModule, LlmModule, OcrModule, GraphModule, JobsModule, RabbitConnectorModule],
    providers: [
        { provide: APP_FILTER,      useClass: HttpExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: GlobalInterceptor },
    ],
    exports: [MongoDBModule, LlmModule, OcrModule, GraphModule, JobsModule],
})
export class InfraModule {}
