import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Context } from '@/infra/framework/context/context.decorator';
import { RequestContext } from '@/infra/framework/context/request-context';
import { GetNotificationTokenHandler } from '@/application/notifications/domain/queries/get-notification-token.handler';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly getToken: GetNotificationTokenHandler) {}

    @Get('token')
    token(@Context() ctx: RequestContext) {
        return this.getToken.execute(ctx);
    }
}
