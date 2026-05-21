import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ChangeStream } from 'mongodb';
import { Model } from 'mongoose';
import { JobStatus } from '@/domain/enums/job-status.enum';
import { Job, JobDocument } from '@/application/jobs/infra/db/mongo/schemas/job.schema';
import { JobReadModel } from '@/domain/read-models/job/job.read-model';
import { CreateJobCommand } from '@/domain/dtos/jobs/commands/create-job.command';
import { UpdateJobStatusCommand } from '@/domain/dtos/jobs/commands/update-job-status.command';
import { JobResult } from '@/domain/read-models/job/job.read-model';

@Injectable()
export class JobRepository {
    constructor(@InjectModel(Job.name) private readonly model: Model<Job>) {}

    async create(command: CreateJobCommand): Promise<JobReadModel> {
        const doc = await this.model.create({
            tenantId: command.tenantId,
            userId:   command.userId,
            type:     command.type,
            payload:  command.payload,
        });
        return this.toReadModel(doc);
    }

    async findByTenant(tenantId: string, status?: JobStatus): Promise<JobReadModel[]> {
        const filter: Record<string, unknown> = { tenantId };
        if (status) filter.status = status;
        const docs = await this.model.find(filter).sort({ createdAt: -1 }).exec();
        return docs.map((doc) => this.toReadModel(doc));
    }

    async updateStatus(jobId: string, command: UpdateJobStatusCommand): Promise<JobReadModel | null> {
        const doc = await this.model.findByIdAndUpdate(
            jobId,
            { status: command.status, error: command.error },
            { new: true },
        );
        return doc ? this.toReadModel(doc) : null;
    }

    async addStep(jobId: string, step: { name: string; data?: unknown; status: number }): Promise<JobReadModel | null> {
        const doc = await this.model.findByIdAndUpdate(
            jobId,
            {
                $set: { status: JobStatus.RUNNING },
                $push: { 'result.steps': step },
            },
            { new: true },
        );
        return doc ? this.toReadModel(doc) : null;
    }

    async findById(jobId: string): Promise<JobReadModel | null> {
        const doc = await this.model.findById(jobId);
        return doc ? this.toReadModel(doc) : null;
    }

    watchJob(jobId: string): ChangeStream {
        return this.model.watch(
            [{ $match: { 'documentKey._id': jobId } }],
            { fullDocument: 'updateLookup' },
        );
    }

    private toReadModel(doc: JobDocument): JobReadModel {
        return {
            jobId:     doc._id,
            tenantId:  doc.tenantId,
            userId:    doc.userId,
            type:      doc.type,
            status:    doc.status,
            payload:   doc.payload,
            result:    doc.result as JobResult | undefined,
            error:     doc.error,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        };
    }
}
