import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AwsModule } from '@/infra/aws/aws.module';
import { PostgresModule } from '@/infra/db/postgres/postgres.module';
import { RabbitConnectorModule } from '@/infra/rabbitmq/rabbit-connector.module';
import { MetricsModule } from '@/infra/metrics/metrics.module';
import { MetricsInterceptor } from '@/infra/framework/http/metrics.interceptor';
import { GlobalInterceptor } from '@/infra/framework/http/global.interceptor';
import { HashIdInterceptor } from '@/infra/framework/http/hash-id.interceptor';
import { HttpExceptionFilter } from '@/infra/framework/http/http-exception.filter';
import { HashIdPipe } from '@/infra/framework/http/hash-id.pipe';
import { HashIdService } from '@/infra/hash-id/hash-id.service';
import { JwtAuthGuard } from '@/infra/framework/auth/jwt-auth.guard';
import { RolesGuard } from '@/infra/framework/permissions/roles.guard';
import { AuthSecretService } from '@/infra/auth/auth-secret.service';
import { ProducerRegistry } from '@/infra/rabbitmq/producer-registry.service';

@Global()
@Module({
    imports: [PostgresModule, AwsModule, RabbitConnectorModule, MetricsModule],
    providers: [
        { provide: APP_FILTER,      useClass: HttpExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
        { provide: APP_INTERCEPTOR, useClass: GlobalInterceptor },
        { provide: APP_INTERCEPTOR, useClass: HashIdInterceptor },
        { provide: APP_GUARD,       useClass: JwtAuthGuard },
        { provide: APP_GUARD,       useClass: RolesGuard },
        HashIdService,
        HashIdPipe,
        AuthSecretService,
        ProducerRegistry,
    ],
    exports: [HashIdService, HashIdPipe, AuthSecretService, ProducerRegistry],
})
export class InfraModule {}
