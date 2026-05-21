import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from '@/application/jobs/infra/db/mongo/schemas/job.schema';
import { JobRepository } from '@/application/jobs/infra/db/mongo/job.repository';
import { CreateJobHandler } from '@/application/jobs/domain/commands/create-job.handler';
import { UpdateJobStatusHandler } from '@/application/jobs/domain/commands/update-job-status.handler';
import { AddJobStepHandler } from '@/application/jobs/domain/commands/add-job-step.handler';
import { GetJobHandler } from '@/application/jobs/domain/queries/get-job.handler';
import { ListJobsHandler } from '@/application/jobs/domain/queries/list-jobs.handler';
import { JobsController } from '@/application/jobs/controllers/jobs.controller';
import { StreamController } from '@/application/jobs/controllers/stream.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    ],
    controllers: [JobsController, StreamController],
    providers: [
        JobRepository,
        CreateJobHandler,
        UpdateJobStatusHandler,
        AddJobStepHandler,
        GetJobHandler,
        ListJobsHandler,
    ],
    exports: [JobRepository],
})
export class JobsModule {}
