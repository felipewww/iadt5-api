import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { AddJobStepCommand } from '@/domain/dtos/jobs/commands/add-job-step.command';
import { JobOutput } from '@/domain/dtos/jobs/outputs/job.output';
import { JobRepository } from '@/application/jobs/infra/db/mongo/job.repository';

export type AddJobStepInput = Omit<AddJobStepCommand, 'data'> & { jobId: string; data?: unknown };

@Injectable()
export class AddJobStepHandler implements Handler<AddJobStepInput, JobOutput> {
    constructor(private readonly jobRepository: JobRepository) {}

    async execute(input: AddJobStepInput): Promise<JobOutput> {
        const { jobId, ...step } = input;
        const job = await this.jobRepository.addStep(jobId, step);

        if (!job) throw new NotFoundException(`Job ${jobId} não encontrado`);

        return JobOutput.from(job);
    }
}
