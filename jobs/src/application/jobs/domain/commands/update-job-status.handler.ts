import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { UpdateJobStatusCommand } from '@/domain/dtos/jobs/commands/update-job-status.command';
import { JobOutput } from '@/domain/dtos/jobs/outputs/job.output';
import { JobRepository } from '@/application/jobs/infra/db/mongo/job.repository';

export type UpdateJobStatusInput = UpdateJobStatusCommand & { jobId: string };

@Injectable()
export class UpdateJobStatusHandler implements Handler<UpdateJobStatusInput, JobOutput> {
    constructor(private readonly jobRepository: JobRepository) {}

    async execute(input: UpdateJobStatusInput): Promise<JobOutput> {
        const { jobId, ...command } = input;
        const job = await this.jobRepository.updateStatus(jobId, command);

        if (!job) throw new NotFoundException(`Job ${jobId} não encontrado`);

        return JobOutput.from(job);
    }
}
