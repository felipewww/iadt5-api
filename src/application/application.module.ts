import { Module } from '@nestjs/common';
import { RabbitConnectorModule } from '@/application/_rabbit-mq/rabbit-connector.module';

@Module({
    imports: [RabbitConnectorModule],
    controllers: [],
    providers: [],
})
export class ApplicationModule {}
