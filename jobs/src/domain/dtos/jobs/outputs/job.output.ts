import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '@/domain/enums/job-status.enum';
import { JobReadModel, JobResult } from '@/domain/read-models/job/job.read-model';

export class JobOutput {
    @ApiProperty() jobId: string;
    @ApiProperty() tenantId: string;
    @ApiPropertyOptional() userId?: string;
    @ApiProperty() type: string;
    @ApiProperty({ enum: JobStatus }) status: JobStatus;
    @ApiPropertyOptional() payload?: Record<string, unknown>;
    @ApiPropertyOptional() result?: JobResult;
    @ApiPropertyOptional() error?: string;
    @ApiProperty() createdAt: Date;
    @ApiProperty() updatedAt: Date;

    static from(this: void, model: JobReadModel): JobOutput {
        const output   = new JobOutput();
        output.jobId    = model.jobId;
        output.tenantId = model.tenantId;
        output.userId   = model.userId;
        output.type     = model.type;
        output.status  = model.status;
        output.payload = model.payload;
        output.result  = model.result;
        output.error   = model.error;
        output.createdAt = model.createdAt;
        output.updatedAt = model.updatedAt;
        return output;
    }
}
