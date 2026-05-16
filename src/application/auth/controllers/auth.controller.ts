import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/infra/framework/auth/public.decorator';
import { LoginCommand } from '@/domain/dtos/auth/commands/login.command';
import { LoginHandler } from '@/application/auth/domain/commands/login.handler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly loginHandler: LoginHandler) {}

    @Post('login')
    @Public()
    login(@Body() body: LoginCommand) {
        return this.loginHandler.execute(body);
    }
}
