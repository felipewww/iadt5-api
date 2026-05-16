import { Module } from '@nestjs/common';
import { RabbitConnectorModule } from '@/application/_rabbit-mq/rabbit-connector.module';
import { IamModule } from '@/application/iam/iam.module';

@Module({
    imports: [RabbitConnectorModule, IamModule],
    controllers: [],
    providers: [],
})
export class ApplicationModule {}
