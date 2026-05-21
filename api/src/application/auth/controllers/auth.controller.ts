import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/infra/framework/auth/public.decorator';
import { Context } from '@/infra/framework/context/context.decorator';
import { RequestContext } from '@/infra/framework/context/request-context';
import { LoginCommand } from '@/domain/dtos/auth/commands/login.command';
import { LoginHandler } from '@/application/auth/domain/commands/login.handler';
import { RefreshHandler } from '@/application/auth/domain/commands/refresh.handler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly loginHandler: LoginHandler,
        private readonly refreshHandler: RefreshHandler,
    ) {}

    @Post('login')
    @Public()
    login(@Body() body: LoginCommand, @Context() ctx: RequestContext) {
        return this.loginHandler.execute(body, ctx);
    }

    @Post('refresh')
    @Public()
    refresh(@Headers('x-rt') refreshToken: string, @Context() ctx: RequestContext) {
        return this.refreshHandler.execute(refreshToken, ctx);
    }
}
