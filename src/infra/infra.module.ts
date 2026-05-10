import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AwsModule } from '@/infra/aws/aws.module';
import { PostgresModule } from '@/infra/db/postgres/postgres.module';
import { GlobalInterceptor } from '@/infra/framework/http/global.interceptor';

@Module({
    imports: [
        PostgresModule,
        AwsModule
    ],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: GlobalInterceptor,
        },
    ],
})
export class InfraModule {}
