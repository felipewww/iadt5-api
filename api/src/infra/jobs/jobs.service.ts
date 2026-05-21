import { Injectable } from '@nestjs/common';
import { SignJWT } from 'jose';

export type CreateJobInput = {
    tenantId: string;
    type: string;
    payload?: Record<string, unknown>;
};

export type CreateJobResult = {
    jobId: string;
    streamToken: string;
};

@Injectable()
export class JobsService {
    private get baseUrl(): string {
        return process.env.JOBS_SERVICE_URL ?? 'http://platform-jobs:3100';
    }

    private get secret(): Uint8Array {
        const key = process.env.COGNITE_JOBS_SECRET;
        if (!key) throw new Error('COGNITE_JOBS_SECRET não configurado');
        return new TextEncoder().encode(key);
    }

    async create(input: CreateJobInput): Promise<CreateJobResult> {
        const res = await fetch(`${this.baseUrl}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });

        if (!res.ok) {
            throw new Error(`Falha ao criar job: ${res.status}`);
        }

        const { data: { jobId } } = (await res.json()) as { data: { jobId: string } };

        const streamToken = await new SignJWT({ jobId, tenantId: input.tenantId })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('2h')
            .sign(this.secret);

        return { jobId, streamToken };
    }

    async generateToken(jobId: string, tenantId: string): Promise<string> {
        return new SignJWT({ jobId, tenantId })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('2h')
            .sign(this.secret);
    }

    async addStep(jobId: string, step: { name: string; data: unknown; status: number }): Promise<void> {
        await fetch(`${this.baseUrl}/jobs/${jobId}/steps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(step),
        });
    }

    async patchStatus(jobId: string, status: 'DONE' | 'FAILED', error?: string): Promise<void> {
        await fetch(`${this.baseUrl}/jobs/${jobId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, ...(error ? { error } : {}) }),
        });
    }
}
