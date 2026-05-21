import { IMessagePattern, Consumer } from '@/infra/framework/rabbitmq/Consumer';
import { Queue } from '@/infra/framework/rabbitmq/Queue';
import { AuthSecretService } from '@/infra/auth/auth-secret.service';
import { AuthSecretRotatedMessage } from '@/infra/rabbitmq/messages/auth-secret-rotated.message';

export class AuthSecretConsumer extends Consumer<AuthSecretRotatedMessage> {
    constructor(
        queue: Queue,
        private readonly authSecretService: AuthSecretService,
    ) {
        super(queue);
    }

    protected async handler(message: IMessagePattern<AuthSecretRotatedMessage>): Promise<void> {
        const { secretAccess, secretRefresh } = message.data;
        this.authSecretService.upgrade(secretAccess, secretRefresh);
    }
}
