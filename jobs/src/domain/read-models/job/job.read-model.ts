import { JobStatus } from '@/domain/enums/job-status.enum';

export type JobStep = {
    name: string;
    data?: unknown;
    status: number;
};

export type JobResult = {
    steps: JobStep[];
};

export type JobReadModel = {
    jobId: string;
    tenantId: string;
    userId?: string;
    type: string;
    status: JobStatus;
    payload?: Record<string, unknown>;
    result?: JobResult;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
};
