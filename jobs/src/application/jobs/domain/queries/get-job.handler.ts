import { Injectable, NotFoundException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { JobOutput } from '@/domain/dtos/jobs/outputs/job.output';
import { JobRepository } from '@/application/jobs/infra/db/mongo/job.repository';

@Injectable()
export class GetJobHandler implements Handler<string, JobOutput> {
    constructor(private readonly jobRepository: JobRepository) {}

    async execute(jobId: string): Promise<JobOutput> {
        const job = await this.jobRepository.findById(jobId);

        if (!job) throw new NotFoundException(`Job ${jobId} não encontrado`);

        return JobOutput.from(job);
    }
}
