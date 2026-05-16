import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '@/infra/framework/auth/public.decorator';
import { MetricsGuard } from '@/infra/metrics/metrics.guard';
import { MetricsService } from '@/infra/metrics/metrics.service';

@Controller('metrics')
@Public()
@UseGuards(MetricsGuard)
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}

    @Get()
    async get(@Res() res: Response): Promise<void> {
        const body = await this.metricsService.metrics();
        res.set('Content-Type', this.metricsService.contentType);
        res.end(body);
    }
}
