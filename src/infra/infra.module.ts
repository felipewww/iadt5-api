import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AwsModule } from '@/infra/aws/aws.module';
import { PostgresModule } from '@/infra/db/postgres/postgres.module';
import { GlobalInterceptor } from '@/infra/framework/http/global.interceptor';
import { HashIdInterceptor } from '@/infra/framework/http/hash-id.interceptor';
import { HashIdPipe } from '@/infra/framework/http/hash-id.pipe';
import { HashIdService } from '@/infra/hash-id/hash-id.service';
import { JwtAuthGuard } from '@/infra/framework/auth/jwt-auth.guard';
import { RolesGuard } from '@/infra/framework/permissions/roles.guard';
import { GroupPermissionsCache } from '@/infra/cache/group-permissions.cache';
import { ProducerRegistry } from '@/infra/rabbitmq/producer-registry.service';

@Global()
@Module({
    imports: [PostgresModule, AwsModule],
    providers: [
        { provide: APP_INTERCEPTOR, useClass: GlobalInterceptor },
        { provide: APP_INTERCEPTOR, useClass: HashIdInterceptor },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        HashIdService,
        HashIdPipe,
        GroupPermissionsCache,
        ProducerRegistry,
    ],
    exports: [HashIdService, HashIdPipe, GroupPermissionsCache, ProducerRegistry],
})
export class InfraModule {}
