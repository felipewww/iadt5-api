import { Module } from '@nestjs/common';
import { MetricsService } from '@/infra/metrics/metrics.service';
import { MetricsController } from '@/infra/metrics/metrics.controller';

@Module({
    controllers: [MetricsController],
    providers: [MetricsService],
    exports: [MetricsService],
})
export class MetricsModule {}
