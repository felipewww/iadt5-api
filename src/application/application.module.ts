import { Module } from '@nestjs/common';
import { IamModule } from '@/application/iam/iam.module';
import { AuthModule } from '@/application/auth/auth.module';

@Module({
    imports: [IamModule, AuthModule],
    controllers: [],
    providers: [],
})
export class ApplicationModule {}
