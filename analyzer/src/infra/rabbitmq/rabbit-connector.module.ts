import { Inject, Logger, Module, OnModuleInit } from '@nestjs/common';
import * as RabbitMQ from 'src/infra/framework/rabbitmq/module';
import { Exchanges } from '@/infra/rabbitmq/exchanges';
import { Queues } from '@/infra/rabbitmq/queues';
import { AnalysisRequestConsumer } from '@/infra/rabbitmq/consumers/analysis-request.consumer';
import { JobsService } from '@/infra/jobs/jobs.service';
import { AnalysisPipelineService } from '@/infra/jobs/analysis-pipeline.service';
import { JobsModule } from '@/infra/jobs/jobs.module';
import { AnalysisGraphService } from '@/infra/graph/analysis.graph';
import { GraphModule } from '@/infra/graph/graph.module';

@Module({ imports: [JobsModule, GraphModule] })
export class RabbitConnectorModule implements OnModuleInit {
    private readonly logger = new Logger(RabbitConnectorModule.name);

    constructor(
        @Inject(JobsService) private readonly jobsService: JobsService,
        @Inject(AnalysisGraphService) private readonly graphService: AnalysisGraphService,
        @Inject(AnalysisPipelineService) private readonly pipelineService: AnalysisPipelineService,
    ) {}

    async onModuleInit(): Promise<void> {
        const user = process.env.RMQ_USER;
        const pass = process.env.RMQ_PASS;
        const host = process.env.RMQ_HOST;
        const connectionString = `amqp://${user}:${pass}@${host}`;

        try {
            const conn = new RabbitMQ.Connection('analyzer_conn', connectionString);
            await conn.init(
                [Exchanges.EXC_ANALYZER],
                [new AnalysisRequestConsumer(this.jobsService, this.graphService, this.pipelineService)],
            );
            this.logger.log(`RabbitMQ conectado | exchange=${Exchanges.EXC_ANALYZER.name} queue=${Queues.QUEUE_ANALYZER.name}`);
        } catch (err) {
            this.logger.error('Erro ao conectar RabbitMQ', err);
        }
    }
}
