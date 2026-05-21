import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Knex } from 'knex';
import { ProducerRegistry } from '@/infra/rabbitmq/producer-registry.service';
import { AuthSecretRotatedMessage } from '@/infra/rabbitmq/messages/auth-secret-rotated.message';
import { manifest } from '@/infra/manifest/manifest';

@Injectable()
export class AuthSecretService implements OnModuleInit {
    private secretAccess: string;
    private secretRefresh: string;

    constructor(
        @Inject('PG_CONNECTION') private readonly db: Knex,
        private readonly producerRegistry: ProducerRegistry,
    ) {}

    async onModuleInit(): Promise<void> {
        const row = await this.db<{ secret_access: string; secret_refresh: string }>('auth_config')
            .select('secret_access', 'secret_refresh')
            .first();
        if (!row) throw new Error('auth_config table is empty — run migrations');
        this.secretAccess = row.secret_access;
        this.secretRefresh = row.secret_refresh;
    }

    buildAccessSecret(): Uint8Array {
        return new TextEncoder().encode(`${process.env.JWT_SECRET}-${this.secretAccess}`);
    }

    buildRefreshSecret(): Uint8Array {
        return new TextEncoder().encode(`${process.env.JWT_SECRET}-${this.secretRefresh}`);
    }

    async update(includeRefresh = false): Promise<void> {
        const secretAccess = Math.random().toString(36).substring(2);
        const secretRefresh = includeRefresh ? Math.random().toString(36).substring(2) : this.secretRefresh;

        await this.db('auth_config').update({
            secret_access: secretAccess,
            secret_refresh: secretRefresh,
            updated_at: new Date(),
        });

        this.secretAccess = secretAccess;
        this.secretRefresh = secretRefresh;

        this.producerRegistry
            .get<AuthSecretRotatedMessage>('PRODUCER_AUTH_SECRET')
            ?.publish({
                tenant: { id: manifest.tenatId, schema: manifest.uid, location: manifest.projectId },
                data: { secretAccess, secretRefresh },
            });
    }

    upgrade(secretAccess: string, secretRefresh: string): void {
        this.secretAccess = secretAccess;
        this.secretRefresh = secretRefresh;
    }
}
