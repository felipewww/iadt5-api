import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsModule } from '@/infra/metrics/metrics.module';
import { MongoModule } from '@/infra/mongo/mongo.module';
import { MetricsInterceptor } from '@/infra/framework/http/metrics.interceptor';
import { GlobalInterceptor } from '@/infra/framework/http/global.interceptor';
import { HttpExceptionFilter } from '@/infra/framework/http/http-exception.filter';
import { TokenService } from '@/infra/token/token.service';

@Global()
@Module({
    imports: [MetricsModule, MongoModule],
    providers: [
        { provide: APP_FILTER,      useClass: HttpExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
        { provide: APP_INTERCEPTOR, useClass: GlobalInterceptor },
        TokenService,
    ],
    exports: [TokenService],
})
export class InfraModule {}
