import { Injectable, Logger } from '@nestjs/common';
import { config } from '@/infra/config';

@Injectable()
export class JobsService {
    private readonly logger = new Logger(JobsService.name);
    private readonly baseUrl = config.jobsServiceUrl;

    async patchStatus(jobId: string, status: string, error?: string): Promise<void> {
        const body: Record<string, string> = { status };
        if (error) body.error = error;

        const res = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            this.logger.warn(`patchStatus falhou | job=${jobId} status=${res.status}`);
        }
    }

    async addStep(jobId: string, step: { name: string; data: unknown; status: number }): Promise<void> {
        const res = await fetch(`${this.baseUrl}/jobs/${jobId}/steps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(step),
        });

        if (!res.ok) {
            this.logger.warn(`addStep falhou | job=${jobId} step=${step.name} status=${res.status}`);
        }
    }
}
