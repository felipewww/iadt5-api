import { Module } from '@nestjs/common';
import { IamModule } from '@/application/iam/iam.module';
import { AuthModule } from '@/application/auth/auth.module';
import { NotificationsModule } from '@/application/notifications/notifications.module';
import { ProjectsModule } from '@/application/projects/projects.module';

@Module({
    imports: [IamModule, AuthModule, NotificationsModule, ProjectsModule],
    controllers: [],
    providers: [],
})
export class ApplicationModule {}
