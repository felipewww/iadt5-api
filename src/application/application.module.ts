import { Module } from '@nestjs/common';
import { RabbitConnectorModule } from '@/application/_rabbit-mq/rabbit-connector.module';
import { IamModule } from '@/application/iam/iam.module';
import { AuthModule } from '@/application/auth/auth.module';

@Module({
    imports: [RabbitConnectorModule, IamModule, AuthModule],
    controllers: [],
    providers: [],
})
export class ApplicationModule {}
