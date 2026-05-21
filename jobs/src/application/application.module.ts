import { Module } from '@nestjs/common';
import { JobsModule } from '@/application/jobs/jobs.module';

@Module({
    imports: [JobsModule],
    controllers: [],
    providers: [],
})
export class ApplicationModule {}
