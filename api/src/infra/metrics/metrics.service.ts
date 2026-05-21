import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';
import { manifest } from '@/infra/manifest/manifest';

@Injectable()
export class MetricsService {
    readonly registry = new Registry();

    private readonly requestsTotal = new Counter({
        name: 'http_requests_total',
        help: 'Total de requisições HTTP',
        labelNames: ['method', 'route', 'status', 'tenant'],
        registers: [this.registry],
    });

    private readonly requestDuration = new Histogram({
        name: 'http_request_duration_ms',
        help: 'Duração das requisições HTTP em milissegundos',
        labelNames: ['method', 'route', 'status', 'tenant'],
        buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
        registers: [this.registry],
    });

    constructor() {
        collectDefaultMetrics({
            register: this.registry,
            labels: { tenant: manifest.uid },
        });
    }

    record(method: string, route: string, status: number, durationMs: number): void {
        const labels = { method, route, status: String(status), tenant: manifest.uid };
        this.requestsTotal.inc(labels);
        this.requestDuration.observe(labels, durationMs);
    }

    async metrics(): Promise<string> {
        return this.registry.metrics();
    }

    get contentType(): string {
        return this.registry.contentType;
    }
}
