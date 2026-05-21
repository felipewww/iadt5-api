import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';
import { JobStatus } from '@/domain/enums/job-status.enum';

export type JobDocument = HydratedDocument<Job> & { _id: string };

@Schema({ _id: false })
export class JobStep {
    @Prop({ required: true }) name: string;
    @Prop({ type: Object })   data?: unknown;
    @Prop({ required: true }) status: number;
}

export const JobStepSchema = SchemaFactory.createForClass(JobStep);

@Schema({ _id: false })
export class JobResult {
    @Prop({ type: [JobStepSchema], default: [] }) steps: JobStep[];
}

export const JobResultSchema = SchemaFactory.createForClass(JobResult);

@Schema({ timestamps: true, versionKey: false })
export class Job {
    @Prop({ type: String, default: () => randomUUID() })
    _id: string;

    @Prop({ required: true, index: true })
    tenantId: string;

    @Prop({ type: String, index: true })
    userId?: string;

    @Prop({ required: true })
    type: string;

    @Prop({ required: true, enum: JobStatus, default: JobStatus.CREATED })
    status: JobStatus;

    @Prop({ type: Object })
    payload?: Record<string, unknown>;

    @Prop({ type: JobResultSchema })
    result?: JobResult;

    @Prop({ type: String })
    error?: string;

    readonly createdAt: Date;
    readonly updatedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);
