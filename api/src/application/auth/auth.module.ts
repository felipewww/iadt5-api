import { Module } from '@nestjs/common';
import { IamModule } from '@/application/iam/iam.module';
import { AuthController } from '@/application/auth/controllers/auth.controller';
import { LoginHandler } from '@/application/auth/domain/commands/login.handler';
import { RefreshHandler } from '@/application/auth/domain/commands/refresh.handler';

@Module({
    imports: [IamModule],
    controllers: [AuthController],
    providers: [LoginHandler, RefreshHandler],
})
export class AuthModule {}
