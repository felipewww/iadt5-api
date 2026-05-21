import { Module } from '@nestjs/common';
import { JobsService } from '@/infra/jobs/jobs.service';

@Module({
    providers: [JobsService],
    exports: [JobsService],
})
export class JobsModule {}
