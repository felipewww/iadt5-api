import { Module } from '@nestjs/common';
import { NotificationsController } from '@/application/notifications/controllers/notifications.controller';
import { GetNotificationTokenHandler } from '@/application/notifications/domain/queries/get-notification-token.handler';

@Module({
    controllers: [NotificationsController],
    providers: [GetNotificationTokenHandler],
})
export class NotificationsModule {}
