import './infra/config';
import { Module } from '@nestjs/common';
import { InfraModule } from '@/infra/infra.module';
import { ApplicationModule } from '@/application/application.module';

@Module({
    imports: [
        InfraModule,
        ApplicationModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
