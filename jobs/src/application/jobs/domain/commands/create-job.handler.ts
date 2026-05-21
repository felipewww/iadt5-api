import { Injectable } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { CreateJobCommand } from '@/domain/dtos/jobs/commands/create-job.command';
import { JobOutput } from '@/domain/dtos/jobs/outputs/job.output';
import { JobRepository } from '@/application/jobs/infra/db/mongo/job.repository';

@Injectable()
export class CreateJobHandler implements Handler<CreateJobCommand, JobOutput> {
    constructor(private readonly jobRepository: JobRepository) {}

    async execute(input: CreateJobCommand): Promise<JobOutput> {
        const job = await this.jobRepository.create(input);
        return JobOutput.from(job);
    }
}
