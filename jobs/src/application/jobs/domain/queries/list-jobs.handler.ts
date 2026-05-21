import { Injectable } from '@nestjs/common';
import { JobRepository } from '@/application/jobs/infra/db/mongo/job.repository';
import { ListJobsQuery } from '@/domain/dtos/jobs/queries/list-jobs.query';
import { JobOutput } from '@/domain/dtos/jobs/outputs/job.output';

@Injectable()
export class ListJobsHandler {
    constructor(private readonly jobRepository: JobRepository) {}

    async execute(query: ListJobsQuery): Promise<JobOutput[]> {
        const jobs = await this.jobRepository.findByTenant(query.tenantId, query.status);
        return jobs.map(JobOutput.from);
    }
}
