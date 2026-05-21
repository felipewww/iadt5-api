import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateJobCommand } from '@/domain/dtos/jobs/commands/create-job.command';
import { UpdateJobStatusCommand } from '@/domain/dtos/jobs/commands/update-job-status.command';
import { AddJobStepCommand } from '@/domain/dtos/jobs/commands/add-job-step.command';
import { ListJobsQuery } from '@/domain/dtos/jobs/queries/list-jobs.query';
import { CreateJobHandler } from '@/application/jobs/domain/commands/create-job.handler';
import { UpdateJobStatusHandler } from '@/application/jobs/domain/commands/update-job-status.handler';
import { AddJobStepHandler } from '@/application/jobs/domain/commands/add-job-step.handler';
import { GetJobHandler } from '@/application/jobs/domain/queries/get-job.handler';
import { ListJobsHandler } from '@/application/jobs/domain/queries/list-jobs.handler';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
    constructor(
        private readonly createHandler:       CreateJobHandler,
        private readonly updateStatusHandler: UpdateJobStatusHandler,
        private readonly addStepHandler:      AddJobStepHandler,
        private readonly getJobHandler:       GetJobHandler,
        private readonly listJobsHandler:     ListJobsHandler,
    ) {}

    @Post()
    create(@Body() command: CreateJobCommand) {
        return this.createHandler.execute(command);
    }

    @Patch(':jobId')
    updateStatus(@Param('jobId') jobId: string, @Body() command: UpdateJobStatusCommand) {
        return this.updateStatusHandler.execute({ jobId, ...command });
    }

    @Post(':jobId/steps')
    addStep(@Param('jobId') jobId: string, @Body() command: AddJobStepCommand) {
        return this.addStepHandler.execute({ jobId, ...command });
    }

    @Get()
    list(@Query() query: ListJobsQuery) {
        return this.listJobsHandler.execute(query);
    }

    @Get(':jobId')
    getJob(@Param('jobId') jobId: string) {
        return this.getJobHandler.execute(jobId);
    }
}
